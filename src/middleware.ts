import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Decode base64url
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Paths that require authentication
  const isAdminPath = pathname.startsWith('/admin');
  const isStudentPath = pathname.startsWith('/student');
  const isApiPath = pathname.startsWith('/api') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/settings');

  let user = null;
  if (token) {
    user = decodeJwtPayload(token);
    // Check if token is expired (exp is in seconds)
    if (user && user.exp * 1000 < Date.now()) {
      user = null;
    }
  }

  // Redirect logic for login pages
  if (pathname === '/' || pathname === '/login') {
    if (user) {
      if (user.role === 'STUDENT') {
        return NextResponse.redirect(new URL('/student/home', request.url));
      } else {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // Protection for admin routes
  if (isAdminPath) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.role === 'STUDENT') {
      return NextResponse.redirect(new URL('/student/home', request.url));
    }
  }

  // Protection for student routes
  if (isStudentPath) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // Protection for backend APIs
  if (isApiPath) {
    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Please login.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/student/:path*',
    '/api/:path*',
  ],
};
