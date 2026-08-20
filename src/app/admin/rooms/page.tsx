'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Plus,
  Compass,
  Bed,
  CheckCircle,
  HelpCircle,
  Wrench,
  AlertTriangle,
  Loader2,
  ChevronRight,
  User,
  ExternalLink,
  Info,
  Calendar,
  X,
  Edit,
  Trash2,
  Settings,
  Home,
  Map
} from 'lucide-react';
import Link from 'next/link';
import Toast from '@/components/Toast';

export default function RoomsPage() {
  const { hasPermission } = useAuth();
  
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Selection states
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('map');

  // Modals state
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  // New Modals/Edit states
  const [editBuildingModalOpen, setEditBuildingModalOpen] = useState(false);
  const [floorModalOpen, setFloorModalOpen] = useState(false);
  const [floorModalMode, setFloorModalMode] = useState<'add' | 'edit'>('add');
  const [floorNumberInput, setFloorNumberInput] = useState('');
  const [editRoomModalOpen, setEditRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);

  // Form states
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingFloors, setNewBuildingFloors] = useState('3');
  const [newBuildingGender, setNewBuildingGender] = useState('COLIVING');
  const [newBuildingDescription, setNewBuildingDescription] = useState('');
  const [editBuildingGender, setEditBuildingGender] = useState('COLIVING');
  const [editBuildingDescription, setEditBuildingDescription] = useState('');


  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState('Non-AC');
  const [newRoomCapacity, setNewRoomCapacity] = useState('2');
  const [newRoomRent, setNewRoomRent] = useState('6000');
  const [newRoomFacilities, setNewRoomFacilities] = useState('Wifi, Wardrobe');
  const [newRoomSubRooms, setNewRoomSubRooms] = useState('');

  // Room edit form states
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomType, setEditRoomType] = useState('Non-AC');
  const [editRoomCapacity, setEditRoomCapacity] = useState('2');
  const [editRoomRent, setEditRoomRent] = useState('6000');
  const [editRoomFacilities, setEditRoomFacilities] = useState('Wifi, Wardrobe');
  const [editRoomStatus, setEditRoomStatus] = useState('AVAILABLE');
  const [newRoomFloorId, setNewRoomFloorId] = useState('');
  const [editRoomFloorId, setEditRoomFloorId] = useState('');
  const [isSubRoomsEnabled, setIsSubRoomsEnabled] = useState(false);
  const [subRoomsRows, setSubRoomsRows] = useState<{ name: string; beds: string }[]>([]);

  // Selected student occupant info for checkout modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedBedName, setSelectedBedName] = useState('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [checkoutDate, setCheckoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/buildings');
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);
        if (data.length > 0) {
          // If no building is selected yet, select the first one
          if (!selectedBuildingId) {
            setSelectedBuildingId(data[0].id);
            if (data[0].floors.length > 0) {
              setSelectedFloorNumber(data[0].floors[0].number);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch rooms hierarchy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBuildingId]);

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const activeFloor = activeBuilding?.floors.find((f: any) => f.number === selectedFloorNumber);
  const activeRooms = activeFloor?.rooms || [];

  const handleAddBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;

    try {
      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newBuildingName, 
          gender: newBuildingGender,
          description: newBuildingDescription,
          floorsCount: newBuildingFloors 
        })
      });

      if (res.ok) {
        const newB = await res.json();
        setToast({ message: `Successfully created ${newB.name}!`, type: 'success' });
        setNewBuildingName('');
        setNewBuildingGender('COLIVING');
        setNewBuildingDescription('');
        setBuildingModalOpen(false);
        // Refresh
        const updatedRes = await fetch('/api/buildings');
        const updatedData = await updatedRes.json();
        setBuildings(updatedData);
        setSelectedBuildingId(newB.id);
        setSelectedFloorNumber(1);
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to create building', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const handleEditBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim() || !selectedBuildingId) return;

    try {
      const res = await fetch('/api/buildings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedBuildingId, 
          name: newBuildingName,
          gender: editBuildingGender,
          description: editBuildingDescription
        })
      });

      if (res.ok) {
        setToast({ message: 'Successfully updated building!', type: 'success' });
        setEditBuildingModalOpen(false);
        setNewBuildingName('');
        setEditBuildingGender('COLIVING');
        setEditBuildingDescription('');
        fetchData();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to update building', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const handleDeleteBuilding = async (buildingId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete building "${name}"? This will delete all floors, rooms, and beds inside it.`)) return;

    try {
      const res = await fetch(`/api/buildings?id=${buildingId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToast({ message: `Successfully deleted building "${name}"!`, type: 'success' });
        const updatedRes = await fetch('/api/buildings');
        const updatedData = await updatedRes.json();
        setBuildings(updatedData);
        if (updatedData.length > 0) {
          setSelectedBuildingId(updatedData[0].id);
          if (updatedData[0].floors.length > 0) {
            setSelectedFloorNumber(updatedData[0].floors[0].number);
          }
        } else {
          setSelectedBuildingId('');
        }
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to delete building', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const handleFloorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuildingId) return;

    try {
      if (floorModalMode === 'add') {
        const res = await fetch('/api/floors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buildingId: selectedBuildingId,
            number: floorNumberInput ? parseInt(floorNumberInput) : undefined
          })
        });

        if (res.ok) {
          const newFloor = await res.json();
          setToast({ message: `Successfully added Floor ${newFloor.number}!`, type: 'success' });
          setFloorModalOpen(false);
          setFloorNumberInput('');
          const updatedRes = await fetch('/api/buildings');
          const updatedData = await updatedRes.json();
          setBuildings(updatedData);
          setSelectedFloorNumber(newFloor.number);
        } else {
          const errData = await res.json();
          setToast({ message: errData.error || 'Failed to add floor', type: 'error' });
        }
      } else {
        if (!activeFloor) return;
        const res = await fetch('/api/floors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeFloor.id,
            number: parseInt(floorNumberInput)
          })
        });

        if (res.ok) {
          const updatedFloor = await res.json();
          setToast({ message: `Successfully updated Floor to ${updatedFloor.number}!`, type: 'success' });
          setFloorModalOpen(false);
          setFloorNumberInput('');
          const updatedRes = await fetch('/api/buildings');
          const updatedData = await updatedRes.json();
          setBuildings(updatedData);
          setSelectedFloorNumber(updatedFloor.number);
        } else {
          const errData = await res.json();
          setToast({ message: errData.error || 'Failed to update floor', type: 'error' });
        }
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const handleDeleteFloor = async (floorId: string, floorNo: number) => {
    if (!window.confirm(`Are you sure you want to delete Floor ${floorNo}? This will delete all rooms and beds inside it.`)) return;

    try {
      const res = await fetch(`/api/floors?id=${floorId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToast({ message: `Successfully deleted Floor ${floorNo}!`, type: 'success' });
        const updatedRes = await fetch('/api/buildings');
        const updatedData = await updatedRes.json();
        setBuildings(updatedData);
        const building = updatedData.find((b: any) => b.id === selectedBuildingId);
        if (building && building.floors.length > 0) {
          setSelectedFloorNumber(building.floors[0].number);
        }
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to delete floor', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const handleEditRoomClick = (room: any) => {
    setEditingRoom(room);
    setEditRoomNumber(room.number);
    setEditRoomType(room.type);
    setEditRoomCapacity((room.parentCapacity || room.capacity).toString());
    setEditRoomRent(room.rent.toString());
    setEditRoomFacilities(room.facilities || '');
    setEditRoomStatus(room.status);
    setEditRoomFloorId(room.floorId);
    setEditRoomModalOpen(true);
  };

  const handleEditRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    try {
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRoom.id,
          number: editRoomNumber,
          type: editRoomType,
          rent: editRoomRent,
          status: editRoomStatus,
          facilities: editRoomFacilities,
          capacity: editRoomCapacity,
          floorId: editRoomFloorId
        })
      });

      if (res.ok) {
        setToast({ message: 'Successfully updated room details!', type: 'success' });
        setEditRoomModalOpen(false);
        setEditingRoom(null);
        setEditRoomFloorId('');
        fetchData();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to update room', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const handleDeleteRoomClick = async (room: any) => {
    if (!window.confirm(`Are you sure you want to delete Room ${room.number}?`)) return;

    try {
      const res = await fetch(`/api/rooms?id=${room.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToast({ message: `Room ${room.number} deleted successfully!`, type: 'success' });
        fetchData();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to delete room', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const handleAddRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim() || !activeFloor) return;

    let subRoomsString = '';
    if (isSubRoomsEnabled) {
      const validRows = subRoomsRows.filter(r => r.name.trim() && r.beds);
      if (validRows.length === 0) {
        setToast({ message: 'Please define at least one sub-room or disable sub-rooms option.', type: 'error' });
        return;
      }
      const totalBeds = validRows.reduce((acc, r) => acc + parseInt(r.beds || '0'), 0);
      if (totalBeds !== parseInt(newRoomCapacity)) {
        setToast({ message: `Total sub-room beds (${totalBeds}) must equal the room beds capacity (${newRoomCapacity}).`, type: 'error' });
        return;
      }
      subRoomsString = validRows.map(r => `${r.name.trim()}:${r.beds.trim()}`).join(',');
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: newRoomNumber,
          type: newRoomType,
          capacity: newRoomCapacity,
          rent: newRoomRent,
          facilities: newRoomFacilities,
          floorId: newRoomFloorId || activeFloor.id,
          buildingId: selectedBuildingId,
          subRoomsConfig: subRoomsString
        })
      });

      if (res.ok) {
        setToast({ message: `Room ${newRoomNumber} added successfully!`, type: 'success' });
        setNewRoomNumber('');
        setNewRoomSubRooms('');
        setNewRoomFloorId('');
        setIsSubRoomsEnabled(false);
        setSubRoomsRows([{ name: '', beds: '' }]);
        setRoomModalOpen(false);
        fetchData();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Failed to add room', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const handleOccupantClick = (student: any, bedName: string, roomNo: string) => {
    setSelectedStudent(student);
    setSelectedBedName(bedName);
    setSelectedRoomNumber(roomNo);
    setStudentModalOpen(true);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !checkoutDate) return;

    setCheckoutSubmitting(true);
    try {
      const res = await fetch('/api/admissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          checkoutDate
        })
      });

      if (res.ok) {
        setToast({ message: `${selectedStudent.name} checked out successfully!`, type: 'success' });
        setStudentModalOpen(false);
        setSelectedStudent(null);
        fetchData();
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || 'Checkout failed', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'OCCUPIED':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'RESERVED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'MAINTENANCE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getBedStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'OCCUPIED':
        return <Bed className="h-4 w-4 text-indigo-400" />;
      case 'RESERVED':
        return <HelpCircle className="h-4 w-4 text-amber-400" />;
      case 'MAINTENANCE':
        return <Wrench className="h-4 w-4 text-rose-400" />;
      default:
        return <HelpCircle className="h-4 w-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading hostel map...</p>
      </div>
    );
  }

  const getVirtualRooms = (roomsList: any[]) => {
    const list: any[] = [];
    roomsList.forEach((room) => {
      // Group beds by sub-room prefix
      const bedsBySubRoom: { [key: string]: any[] } = {};
      const standardBeds: any[] = [];

      // Sort beds numerically by name first
      const sortedBeds = [...room.beds].sort((a: any, b: any) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      sortedBeds.forEach((bed: any) => {
        if (bed.name.includes(' - ')) {
          const subRoomName = bed.name.split(' - ')[0].trim();
          if (!bedsBySubRoom[subRoomName]) {
            bedsBySubRoom[subRoomName] = [];
          }
          bedsBySubRoom[subRoomName].push(bed);
        } else {
          standardBeds.push(bed);
        }
      });

      const subRoomNames = Object.keys(bedsBySubRoom).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );

      if (subRoomNames.length > 0) {
        // Create virtual room for each sub-room
        subRoomNames.forEach((srName) => {
          list.push({
            ...room,
            isVirtual: true,
            virtualNumber: srName,
            parentCapacity: room.capacity,
            capacity: bedsBySubRoom[srName].length,
            beds: bedsBySubRoom[srName]
          });
        });
        if (standardBeds.length > 0) {
          list.push({
            ...room,
            parentCapacity: room.capacity,
            capacity: standardBeds.length,
            beds: standardBeds
          });
        }
      } else {
        list.push({
          ...room,
          beds: sortedBeds
        });
      }
    });

    // Sort the final virtual rooms list in natural numeric order
    return list.sort((a, b) => {
      const aNum = a.isVirtual ? a.virtualNumber : a.number;
      const bNum = b.isVirtual ? b.virtualNumber : b.number;
      return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const renderRoomBox = (room: any) => {
    const occupiedCount = room.beds.filter((b: any) => b.status === 'OCCUPIED').length;
    const isMaintenance = room.status === 'UNDER_MAINTENANCE' || room.status === 'OVERDUE';
    
    // Determine bed arrangement grid based on capacity
    const cap = room.capacity;
    let bedLayoutClass = "grid grid-cols-2 gap-2.5";
    if (cap === 1) {
      bedLayoutClass = "flex justify-center items-center h-full";
    } else if (cap === 3) {
      bedLayoutClass = "grid grid-cols-3 gap-2";
    } else if (cap === 4) {
      bedLayoutClass = "grid grid-cols-2 gap-2";
    } else if (cap > 4 && cap <= 8) {
      bedLayoutClass = "grid grid-cols-4 gap-1.5";
    } else if (cap > 8) {
      bedLayoutClass = "grid grid-cols-5 gap-1.5";
    }

    return (
      <div 
        key={`${room.id}-${room.isVirtual ? room.virtualNumber : room.number}`}
        className="group relative bg-slate-900/60 backdrop-blur-sm border-2 border-slate-800/80 hover:border-violet-500/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between overflow-hidden transition-all duration-300 min-h-[165px] cursor-default"
      >
        {/* Wall Demarcation lines (Architectural Blueprint effect) */}
        <div className="absolute inset-0.5 border border-dashed border-slate-800/30 rounded-xl pointer-events-none" />
        
        {/* Room Entrance Door Arc (Bottom Center) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 border-t-2 border-dashed border-slate-700/60 rounded-t-full bg-slate-950/40 flex items-center justify-center pointer-events-none">
          <span className="text-[5px] text-slate-550 font-extrabold tracking-widest uppercase">DOOR</span>
        </div>

        {/* Color-coded Status LED Indicator */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
          <span className="text-[9px] text-slate-500 block font-bold">{occupiedCount}/{room.capacity}</span>
          <span className={`h-2 w-2 rounded-full shadow-md animate-pulse ${
            isMaintenance ? 'bg-rose-500 shadow-rose-500/40' :
            occupiedCount === room.capacity ? 'bg-indigo-500 shadow-indigo-500/40' :
            occupiedCount === 0 ? 'bg-emerald-500 shadow-emerald-500/40' : 
            'bg-amber-500 shadow-amber-500/40'
          }`} />
        </div>

        {/* Room Header Info */}
        <div className="mb-2">
          <div className="flex items-center justify-between pr-14">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-wide">
                {room.isVirtual ? `Room ${room.virtualNumber}` : `Room ${room.number}`}
              </span>
              <span className={`text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                isMaintenance ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' :
                occupiedCount === room.capacity ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                occupiedCount === 0 ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 
                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {isMaintenance ? 'Maint' :
                 occupiedCount === room.capacity ? 'Full' :
                 occupiedCount === 0 ? 'Empty' : `${room.capacity - occupiedCount} Left`}
              </span>
            </div>
            <div className="flex items-center gap-1 z-10">
              {hasPermission('rooms', 'edit') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditRoomClick(room);
                  }}
                  className="p-1 bg-slate-800/80 hover:bg-violet-600 rounded text-slate-350 hover:text-white transition-all cursor-pointer pointer-events-auto border border-slate-700/60"
                  title="Edit Room"
                >
                  <Edit className="h-3 w-3" />
                </button>
              )}
              {hasPermission('rooms', 'delete') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRoomClick(room);
                  }}
                  className="p-1 bg-slate-800/80 hover:bg-rose-900/60 rounded text-slate-355 hover:text-rose-300 transition-all cursor-pointer pointer-events-auto border border-slate-700/60"
                  title="Delete Room"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">{room.type}</span>
        </div>

        {/* Beds layout inside the Room Blueprint */}
        <div className={`mt-2 flex-1 flex flex-col justify-center ${cap === 1 ? 'items-center' : ''}`}>
          <div className={`${bedLayoutClass} w-full`}>
            {room.beds.map((bed: any) => {
              const isOverdue = bed.status === 'OCCUPIED' && bed.student?.invoices && bed.student.invoices.some((inv: any) => inv.status === 'OVERDUE');
              const isOccupied = bed.status === 'OCCUPIED';
              const isReserved = bed.status === 'RESERVED';
              
              return (
                <div key={bed.id} className="relative group/bed">
                  {/* Visual 2D Bed Blueprint Box */}
                  <button
                    onClick={() => {
                      if (isOccupied && bed.student) {
                        handleOccupantClick(bed.student, bed.name, room.number);
                      } else if (bed.status === 'AVAILABLE' && hasPermission('rooms', 'edit')) {
                        handleEditRoomClick(room);
                      }
                    }}
                    className={`w-full p-2 rounded-lg border flex flex-col justify-between text-left transition-all cursor-pointer hover:scale-[1.05] ${
                      isOverdue
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-400 hover:bg-rose-950/40'
                        : isOccupied
                        ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-955/40'
                        : isReserved
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-400 hover:bg-amber-955/40'
                        : 'bg-emerald-950/15 border-emerald-500/20 text-emerald-450 hover:bg-emerald-950/30'
                    }`}
                  >
                    {/* Bed Pillow & Sheets design */}
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1">
                        {/* Pillow */}
                        <div className={`w-2.5 h-1.5 rounded-sm ${
                          isOverdue ? 'bg-rose-500/50' :
                          isOccupied ? 'bg-indigo-500/50' :
                          isReserved ? 'bg-amber-500/50' : 'bg-emerald-500/30'
                        }`} />
                        <span className="text-[9px] font-bold tracking-tight">B-{bed.name.replace('Bed ', '')}</span>
                      </div>
                      <Bed className="h-3 w-3 opacity-60 flex-shrink-0" />
                    </div>

                    {/* Occupant Name or Allocation trigger */}
                    {isOccupied && bed.student ? (
                      <span className="text-[8px] font-bold truncate block w-full max-w-[80px]">
                        {bed.student.name.split(' ')[0]}
                      </span>
                    ) : bed.status === 'AVAILABLE' ? (
                      hasPermission('rooms', 'edit') ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRoomClick(room);
                          }}
                          className="text-[8px] text-violet-400 hover:text-violet-300 font-extrabold flex items-center gap-0.5 mt-0.5 cursor-pointer pointer-events-auto"
                        >
                          + EDIT
                        </span>
                      ) : (
                        <span className="text-[8px] text-slate-600 block italic">Empty</span>
                      )
                    ) : (
                      <span className="text-[8px] text-slate-500 block italic capitalize">{bed.status.toLowerCase()}</span>
                    )}
                  </button>

                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-955 border border-slate-850 rounded-xl p-2.5 shadow-2xl opacity-0 scale-95 group-hover/bed:opacity-100 group-hover/bed:scale-100 transition-all pointer-events-none group-hover/bed:pointer-events-auto z-50 text-left text-[10px] space-y-1">
                    <div className="flex justify-between items-center pb-1 border-b border-slate-850">
                      <span className="font-bold text-slate-200">{bed.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        bed.status === 'AVAILABLE' ? 'bg-emerald-500/15 text-emerald-455' : 'bg-indigo-500/15 text-indigo-455'
                      }`}>{bed.status}</span>
                    </div>
                    {bed.student ? (
                      <div className="pt-1">
                        <p className="text-slate-200 font-bold truncate">👤 {bed.student.name}</p>
                        <p className="text-slate-400 mt-0.5">📞 +91 {bed.student.phone}</p>
                        {isOverdue && <p className="text-rose-450 font-extrabold animate-pulse mt-1">⚠️ Rent Payment Overdue!</p>}
                      </div>
                    ) : bed.status === 'AVAILABLE' ? (
                      hasPermission('rooms', 'edit') ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRoomClick(room);
                          }}
                          className="text-violet-400 font-bold hover:text-violet-300 flex items-center gap-1 mt-1 cursor-pointer pointer-events-auto text-left"
                        >
                          ⚡ Edit Room Details
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <p className="text-slate-500 mt-1 font-medium">Available for allocation</p>
                      )
                    ) : (
                      <p className="text-slate-500 mt-1 italic font-medium">Not available</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Facilities footer summary */}
        {room.facilities && (
          <div className="mt-2 pt-1 border-t border-slate-800/40 flex items-center justify-between text-[8px] text-slate-550 font-medium">
            <span className="truncate max-w-[120px]">🛠️ {room.facilities}</span>
            <span className="font-bold text-slate-400">₹{room.rent}/mo</span>
          </div>
        )}
      </div>
    );
  };

  const virtualRooms = getVirtualRooms(activeRooms);
  const halfRoomsCount = Math.ceil(virtualRooms.length / 2);
  const topRowRooms = virtualRooms.slice(0, halfRoomsCount);
  const bottomRowRooms = virtualRooms.slice(halfRoomsCount);

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Map className="h-6 w-6 text-violet-400" />
            Rooms Map
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage hostel properties, rooms map corridors, and bed status mappings.</p>
        </div>
        <div className="flex gap-3">
          {hasPermission('rooms', 'create') && (
            <>
              <button
                onClick={() => setBuildingModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-855 text-xs font-bold rounded-xl text-slate-200 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Building
              </button>
              <button
                onClick={() => {
                  if (activeFloor) {
                    setNewRoomFloorId(activeFloor.id);
                  }
                  setIsSubRoomsEnabled(false);
                  setSubRoomsRows([{ name: '', beds: '' }]);
                  setRoomModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Room
              </button>
            </>
          )}
        </div>
      </div>

      {/* Buildings tabs */}
      <div className="flex flex-wrap gap-3 border-b border-slate-800/60 pb-5">
        {buildings.map((b) => {
          const totalRooms = b.floors.reduce((acc: number, f: any) => acc + f.rooms.length, 0);
          const totalBeds = b.floors.reduce((acc: number, f: any) => acc + f.rooms.reduce((rAcc: number, r: any) => rAcc + r.beds.length, 0), 0);
          const occupiedBeds = b.floors.reduce((acc: number, f: any) => acc + f.rooms.reduce((rAcc: number, r: any) => rAcc + r.beds.filter((bd: any) => bd.status === 'OCCUPIED').length, 0), 0);
          
          return (
            <button
              key={b.id}
              onClick={() => {
                setSelectedBuildingId(b.id);
                if (b.floors.length > 0) {
                  setSelectedFloorNumber(b.floors[0].number);
                }
              }}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                selectedBuildingId === b.id
                  ? 'bg-violet-600 text-white border-violet-500/30 shadow-lg shadow-violet-600/10'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-855 hover:text-slate-200'
              }`}
            >
              <Home className="h-4.5 w-4.5 shrink-0" />
              <div className="text-left">
                <span className="block">{b.name}</span>
                <span className={`text-[9px] uppercase tracking-wider font-bold block mt-0.5 ${
                  selectedBuildingId === b.id ? 'text-violet-200' : 'text-slate-500'
                }`}>
                  {b.gender || 'COLIVING'} • {b.floors.length} Flrs • {totalRooms} Rms • {occupiedBeds}/{totalBeds} Beds
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Building Management & Floor Tabs */}
      {activeBuilding && (
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50 space-y-4">
          {/* Top Row: Block Information & Editing */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/40">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Block / Building:</span>
              <span className="text-sm font-bold text-white bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <Home className="h-4 w-4 text-violet-400" />
                {activeBuilding.name}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                activeBuilding.gender === 'MALE' ? 'bg-blue-950/40 border-blue-900/40 text-blue-400' :
                activeBuilding.gender === 'FEMALE' ? 'bg-pink-950/40 border-pink-800/40 text-pink-400' :
                'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
              }`}>
                {activeBuilding.gender || 'COLIVING'}
              </span>
              {activeBuilding.description && (
                <span className="text-xs text-slate-450 italic hidden sm:inline truncate max-w-xs" title={activeBuilding.description}>
                  — {activeBuilding.description}
                </span>
              )}
            </div>
            
            {/* Actions for block */}
            <div className="flex items-center gap-2">
              {hasPermission('rooms', 'edit') && (
                <button
                  onClick={() => {
                    setNewBuildingName(activeBuilding.name);
                    setEditBuildingGender(activeBuilding.gender || 'COLIVING');
                    setEditBuildingDescription(activeBuilding.description || '');
                    setEditBuildingModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-805 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Edit Block details"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit Block
                </button>
              )}
              {hasPermission('rooms', 'delete') && (
                <button
                  onClick={() => handleDeleteBuilding(activeBuilding.id, activeBuilding.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-rose-955/15 border border-rose-900/30 text-rose-400 hover:bg-rose-900/30 hover:text-rose-200 rounded-lg transition-colors cursor-pointer"
                  title="Delete Block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Block
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Floor Navigation & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Floors:</span>
              {activeBuilding.floors.length > 0 ? (
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 w-full xs:w-auto">
                  {activeBuilding.floors.map((f: any) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFloorNumber(f.number)}
                      className={`flex-1 xs:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        selectedFloorNumber === f.number
                          ? 'bg-slate-900 text-white border border-slate-800/80 shadow'
                          : 'text-slate-500 hover:text-slate-350'
                      }`}
                    >
                      Floor {f.number}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-550 italic">No floors created</span>
              )}
            </div>

            {/* Floor Action Controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {hasPermission('rooms', 'create') && (
                <button
                  onClick={() => {
                    setFloorModalMode('add');
                    setFloorNumberInput('');
                    setFloorModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-955 border border-slate-850 hover:bg-slate-900 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Add Floor"
                >
                  <Plus className="h-3.5 w-3.5 text-violet-400" />
                  Add Floor
                </button>
              )}
              {activeFloor && hasPermission('rooms', 'edit') && (
                <button
                  onClick={() => {
                    setFloorModalMode('edit');
                    setFloorNumberInput(activeFloor.number.toString());
                    setFloorModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-955 border border-slate-850 hover:bg-slate-900 text-slate-350 rounded-lg transition-colors cursor-pointer"
                  title="Rename Current Floor"
                >
                  <Edit className="h-3.5 w-3.5 text-indigo-400" />
                  Rename Floor
                </button>
              )}
              {activeFloor && hasPermission('rooms', 'delete') && (
                <button
                  onClick={() => handleDeleteFloor(activeFloor.id, activeFloor.number)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-955 border border-slate-850 hover:bg-rose-900/20 text-rose-455 rounded-lg transition-colors cursor-pointer"
                  title="Delete Current Floor"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  Delete Floor
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rooms visual grid */}
      <div className="space-y-6">
        {activeRooms.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/60 border-dashed rounded-2xl p-12 text-center">
            <Map className="h-10 w-10 text-slate-650 mx-auto mb-3 animate-pulse" />
            <p className="text-slate-400 text-sm font-semibold">No rooms added to Floor {selectedFloorNumber} yet.</p>
            {hasPermission('rooms', 'create') && (
              <button
                onClick={() => {
                  if (activeFloor) {
                    setNewRoomFloorId(activeFloor.id);
                  }
                  setIsSubRoomsEnabled(false);
                  setSubRoomsRows([{ name: '', beds: '' }]);
                  setRoomModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-855 text-xs font-bold rounded-xl text-slate-200 transition-colors cursor-pointer"
              >
                Add First Room
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 bg-slate-905/30 p-4 rounded-xl border border-slate-850/60 text-[10px]">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 inline-block"></span>
                <span className="text-slate-300">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 inline-block"></span>
                <span className="text-slate-300">Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-md bg-amber-500/10 border border-amber-500/20 inline-block"></span>
                <span className="text-slate-300">Reserved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-md bg-rose-500/10 border border-rose-500/20 inline-block"></span>
                <span className="text-slate-300">Maintenance / Overdue</span>
              </div>
            </div>

            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 lg:hidden">
              ↔ Swipe map plan horizontally to view all wings
            </span>

            {/* Floor Map Layout */}
            <div className="bg-slate-950 border border-slate-850 p-6 md:p-8 rounded-3xl overflow-x-auto relative">
              <div className="min-w-[800px] space-y-4">
                {/* Top Row (North Wing) of Rooms */}
                <div 
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${Math.max(3, topRowRooms.length)}, minmax(0, 1fr))` }}
                >
                  {topRowRooms.map((room: any) => renderRoomBox(room))}
                  {topRowRooms.length < 3 && Array.from({ length: 3 - topRowRooms.length }).map((_, idx) => (
                    <div key={`empty-top-${idx}`} className="border border-slate-900/60 border-dashed rounded-2xl h-40 flex items-center justify-center opacity-10">
                      <span className="text-[10px] text-slate-655 italic font-semibold">Unallocated Wing Slot</span>
                    </div>
                  ))}
                </div>

                {/* Central Corridor Walkway */}
                <div className="h-14 bg-slate-900/80 border-y border-slate-850/80 rounded-xl flex items-center justify-between px-6 relative overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/10 to-transparent pointer-events-none"></div>
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider z-10">
                    <span>⬅ EXIT LOBBY</span>
                  </div>
                  <div className="flex-1 flex justify-center gap-8 text-[9px] text-slate-500 font-extrabold uppercase tracking-widest pointer-events-none z-0">
                    <span>N O R T H   W I N G</span>
                    <span>•</span>
                    <span>C O R R I D O R</span>
                    <span>•</span>
                    <span>S O U T H   W I N G</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider z-10">
                    <span>LIFT / STAIRS ➡</span>
                  </div>
                </div>

                {/* Bottom Row (South Wing) of Rooms */}
                <div 
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${Math.max(3, topRowRooms.length)}, minmax(0, 1fr))` }}
                >
                  {bottomRowRooms.map((room: any) => renderRoomBox(room))}
                  {bottomRowRooms.length < topRowRooms.length && Array.from({ length: topRowRooms.length - bottomRowRooms.length }).map((_, idx) => (
                    <div key={`empty-bottom-${idx}`} className="border border-slate-900/60 border-dashed rounded-2xl h-40 flex items-center justify-center opacity-10">
                      <span className="text-[10px] text-slate-650 italic font-semibold">Unallocated Wing Slot</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* MODAL: ADD BUILDING */}
      {buildingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative">
            <button
              onClick={() => setBuildingModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">Add Block / Building</h3>
            <form onSubmit={handleAddBuildingSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Building Name</label>
                <input
                  type="text"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  placeholder="e.g. Building A"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Target Gender Type</label>
                <select
                  value={newBuildingGender}
                  onChange={(e) => setNewBuildingGender(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                  required
                >
                  <option value="COLIVING" className="bg-slate-900">Coliving</option>
                  <option value="MALE" className="bg-slate-900">Male Only</option>
                  <option value="FEMALE" className="bg-slate-900">Female Only</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Description</label>
                <textarea
                  value={newBuildingDescription}
                  onChange={(e) => setNewBuildingDescription(e.target.value)}
                  placeholder="e.g. Premium block for students, includes dining area"
                  rows={2}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-650 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Total Floors to Pre-populate</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newBuildingFloors}
                  onChange={(e) => setNewBuildingFloors(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
              >
                Create Building
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ROOM */}
      {roomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative">
            <button
              onClick={() => setRoomModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">Add Room</h3>
            <form onSubmit={handleAddRoomSubmit} className="space-y-4">
              {activeBuilding && activeBuilding.floors.length > 0 && (
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Assign Floor Location</label>
                  <select
                    value={newRoomFloorId || (activeFloor ? activeFloor.id : '')}
                    onChange={(e) => setNewRoomFloorId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                  >
                    {activeBuilding.floors.map((f: any) => (
                      <option key={f.id} value={f.id} className="bg-slate-900">
                        Floor {f.number}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Room Number</label>
                  <input
                    type="text"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder="103"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Room Type</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                  >
                    <option>AC</option>
                    <option>Non-AC</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Beds Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    value={newRoomRent}
                    onChange={(e) => setNewRoomRent(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Room Facilities (comma-separated)</label>
                <input
                  type="text"
                  value={newRoomFacilities}
                  onChange={(e) => setNewRoomFacilities(e.target.value)}
                  placeholder="Wifi, Geyser, Wardrobe"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableSubRooms"
                    checked={isSubRoomsEnabled}
                    onChange={(e) => setIsSubRoomsEnabled(e.target.checked)}
                    className="h-4 w-4 bg-slate-950 border border-slate-800 rounded focus:ring-violet-500 text-violet-600 cursor-pointer"
                  />
                  <label htmlFor="enableSubRooms" className="text-slate-300 text-xs font-semibold cursor-pointer select-none">
                    Split this room into Sub-Rooms (e.g. 10A, 10B)
                  </label>
                </div>

                {isSubRoomsEnabled && (
                  <div className="space-y-2.5 p-3.5 bg-slate-955/40 border border-slate-805/60 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Define Sub-Rooms</span>
                      <span className="text-[9px] text-slate-500">Must sum to {newRoomCapacity} beds</span>
                    </div>
                    
                    {subRoomsRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2 animate-slide-in">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => {
                            const newRows = [...subRoomsRows];
                            newRows[idx].name = e.target.value;
                            setSubRoomsRows(newRows);
                          }}
                          placeholder="e.g. 10A"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-violet-500/50"
                          required
                        />
                        <input
                          type="number"
                          min="1"
                          max={newRoomCapacity}
                          value={row.beds}
                          onChange={(e) => {
                            const newRows = [...subRoomsRows];
                            newRows[idx].beds = e.target.value;
                            setSubRoomsRows(newRows);
                          }}
                          placeholder="Beds"
                          className="w-20 bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-violet-500/50"
                          required
                        />
                        {subRoomsRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSubRoomsRows(subRoomsRows.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:bg-rose-950/20 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => setSubRoomsRows([...subRoomsRows, { name: '', beds: '' }])}
                      className="mt-1 flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Sub-room Row
                    </button>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
              >
                Add Room & Generate Beds
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT DETAILS & CHECKOUT */}
      {studentModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative">
            <button
              onClick={() => setStudentModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/60">
              <div className="h-12 w-12 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-snug">{selectedStudent.name}</h3>
                <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                  Room {selectedRoomNumber} • {selectedBedName}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Phone Number</span>
                  <span className="text-slate-200 font-semibold">
                    <a href={`tel:+91${selectedStudent.phone}`} className="hover:underline text-violet-400 font-semibold">
                      📞 +91 {selectedStudent.phone}
                    </a>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Aadhaar Photo</span>
                  {selectedStudent.idProofUrl ? (
                    <div className="relative group max-w-[120px] mt-1">
                      <img
                        src={selectedStudent.idProofUrl}
                        alt="Aadhaar ID Proof"
                        className="h-10 w-16 object-cover rounded border border-slate-800 cursor-pointer hover:border-violet-500 transition-colors"
                        onClick={() => window.open(selectedStudent.idProofUrl, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity rounded">
                        <span className="text-[8px] text-white font-medium">View</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-450 italic text-[11px]">Not Uploaded</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Monthly Rent</span>
                  <span className="text-slate-200 font-semibold">₹{selectedStudent.monthlyRent.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Security Deposit</span>
                  <span className="text-slate-200 font-semibold">₹{selectedStudent.securityDeposit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Checkout Form */}
            {hasPermission('students', 'edit') && (
              <form onSubmit={handleCheckoutSubmit} className="pt-4 border-t border-slate-800/60 space-y-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-[10px] uppercase tracking-wider mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Student Checkout System</span>
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Actual Checkout Date</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <input
                      type="date"
                      value={checkoutDate}
                      onChange={(e) => setCheckoutDate(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-rose-500/80 rounded-xl py-2 px-10 text-xs text-slate-100 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={checkoutSubmitting}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
                >
                  {checkoutSubmitting ? 'Checking out...' : 'Checkout & Release Bed'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: RENAME BUILDING */}
       {editBuildingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative">
            <button
              onClick={() => setEditBuildingModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">Edit Block / Building</h3>
            <form onSubmit={handleEditBuildingSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Building Name</label>
                <input
                  type="text"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  placeholder="e.g. Building A"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Target Gender Type</label>
                <select
                  value={editBuildingGender}
                  onChange={(e) => setEditBuildingGender(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                  required
                >
                  <option value="COLIVING" className="bg-slate-900">Coliving</option>
                  <option value="MALE" className="bg-slate-900">Male Only</option>
                  <option value="FEMALE" className="bg-slate-900">Female Only</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Description</label>
                <textarea
                  value={editBuildingDescription}
                  onChange={(e) => setEditBuildingDescription(e.target.value)}
                  placeholder="e.g. Premium block for students, includes dining area"
                  rows={2}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-650 focus:outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT FLOOR */}
      {floorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative">
            <button
              onClick={() => setFloorModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">
              {floorModalMode === 'add' ? 'Add Floor' : `Rename Floor ${activeFloor?.number}`}
            </h3>
            <form onSubmit={handleFloorSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Floor Number</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={floorNumberInput}
                  onChange={(e) => setFloorNumberInput(e.target.value)}
                  placeholder={floorModalMode === 'add' ? 'Leave empty for next sequential floor' : 'e.g. 4'}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-650 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
              >
                {floorModalMode === 'add' ? 'Add Floor' : 'Rename Floor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ROOM */}
      {editRoomModalOpen && editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-in relative">
            <button
              onClick={() => {
                setEditRoomModalOpen(false);
                setEditingRoom(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-4">Edit Room {editingRoom.number}</h3>
            <form onSubmit={handleEditRoomSubmit} className="space-y-4">
              {activeBuilding && activeBuilding.floors.length > 0 && (
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Move Room to Floor</label>
                  <select
                    value={editRoomFloorId}
                    onChange={(e) => setEditRoomFloorId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                  >
                    {activeBuilding.floors.map((f: any) => (
                      <option key={f.id} value={f.id} className="bg-slate-900">
                        Floor {f.number}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Room Number</label>
                  <input
                    type="text"
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    placeholder="103"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Room Type</label>
                  <select
                    value={editRoomType}
                    onChange={(e) => setEditRoomType(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                  >
                    <option>AC</option>
                    <option>Non-AC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Room Status</label>
                  <select
                    value={editRoomStatus}
                    onChange={(e) => setEditRoomStatus(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Beds Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={editRoomCapacity}
                    onChange={(e) => setEditRoomCapacity(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-350 text-xs font-semibold mb-2">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    value={editRoomRent}
                    onChange={(e) => setEditRoomRent(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-350 text-xs font-semibold mb-2">Room Facilities (comma-separated)</label>
                <input
                  type="text"
                  value={editRoomFacilities}
                  onChange={(e) => setEditRoomFacilities(e.target.value)}
                  placeholder="Wifi, Geyser, Wardrobe"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-violet-500/80 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
              >
                Save Room Details
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
