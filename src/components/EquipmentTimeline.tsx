// src/components/EquipmentTimeline.tsx: Komponent wizualizacji timeline dla konfliktów sprzętu
// Używa react-calendar-timeline do wyświetlania rezerwacji i wypożyczeń w formie Gantt chart

import React, { useMemo } from 'react';
import Timeline, { TimelineMarkers, TodayMarker, CustomMarker } from 'react-calendar-timeline';
import 'react-calendar-timeline/dist/style.css';
import type { ConflictInfo } from '../types/conflict.types';

interface EquipmentTimelineProps {
  conflictInfo: ConflictInfo[];
  dateFrom: Date;
  dateTo: Date;
}

// Typy dla react-calendar-timeline
interface TimelineItem {
  id: string;
  group: string;
  title: string;
  start_time: number; // timestamp w milisekundach
  end_time: number; // timestamp w milisekundach
  canMove?: boolean;
  canResize?: boolean;
  className?: string;
}

interface TimelineGroup {
  id: string;
  title: string;
  rightTitle?: string;
  height?: number;
  stackItems?: boolean;
}

/**
 * Konwertuje dane konfliktów na format wymagany przez react-calendar-timeline
 */
function prepareTimelineData(
  conflictInfo: ConflictInfo[]
): { items: TimelineItem[]; groups: TimelineGroup[] } {
  const items: TimelineItem[] = [];
  const groups: TimelineGroup[] = [];
  
  // Dla każdego sprzętu z konfliktami
  for (const info of conflictInfo) {
    // Dodaj grupę (wiersz w timeline)
    groups.push({
      id: info.kod,
      title: `${info.sprzet} (${info.kod})`,
      rightTitle: `${info.konflikty.length} konflikt${info.konflikty.length !== 1 ? 'ów' : ''}`,
      stackItems: true
    });
    
    // Dodaj wszystkie rezerwacje tego sprzętu jako itemy
    for (const reservation of info.wszystkieRezerwacje) {
      const startDate = new Date(reservation.od);
      const endDate = new Date(reservation.do);
      
      // Sprawdź czy rezerwacja jest w konflikcie
      const isInConflict = info.konflikty.some(conflict => 
        (conflict.rezerwacja1.kod === reservation.kod && 
         conflict.rezerwacja1.od.getTime() === startDate.getTime()) ||
        (conflict.rezerwacja2.kod === reservation.kod && 
         conflict.rezerwacja2.od.getTime() === startDate.getTime())
      );
      
      // Tytuł itemu: klient + numer rezerwacji
      const title = `${reservation.klient}${reservation.numer ? ` (${reservation.numer})` : ''}`;
      
      items.push({
        id: `${info.kod}-${startDate.getTime()}`,
        group: info.kod,
        title: title,
        start_time: startDate.getTime(), // Konwersja Date na timestamp
        end_time: endDate.getTime(), // Konwersja Date na timestamp
        canMove: false,
        canResize: false,
        className: isInConflict ? 'timeline-item-conflict' : 'timeline-item-normal'
      });
    }
  }
  
  return { items, groups };
}

export const EquipmentTimeline: React.FC<EquipmentTimelineProps> = ({
  conflictInfo,
  dateFrom,
  dateTo
}) => {
  // Przygotuj dane dla timeline
  const { items, groups } = useMemo(() => {
    return prepareTimelineData(conflictInfo);
  }, [conflictInfo]);
  
  // Jeśli brak danych, wyświetl komunikat
  if (conflictInfo.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-brand-dark/40 backdrop-blur-sm rounded-[20px] border border-white/10 shadow-lg shadow-black/20">
        <p className="text-white/70">Brak konfliktów w wybranym okresie</p>
      </div>
    );
  }
  
  // Oblicz zakres dat dla timeline (z marginesem) - jako timestampy
  const timelineStart = useMemo(() => {
    const start = new Date(dateFrom);
    start.setDate(start.getDate() - 1); // 1 dzień wcześniej
    return start.getTime(); // Konwersja na timestamp
  }, [dateFrom]);
  
  const timelineEnd = useMemo(() => {
    const end = new Date(dateTo);
    end.setDate(end.getDate() + 1); // 1 dzień później
    return end.getTime(); // Konwersja na timestamp
  }, [dateTo]);
  
  return (
    <div className="w-full bg-brand-dark/40 backdrop-blur-sm rounded-[20px] border border-white/10 shadow-lg shadow-black/20 p-4">
      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400/70 rounded shadow-sm"></div>
          <span className="text-white/90">Konflikt (przerwa &lt; 2 dni)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400/70 rounded shadow-sm"></div>
          <span className="text-white/90">Normalna rezerwacja</span>
        </div>
      </div>
      
      <div className="timeline-container" style={{ height: Math.max(400, groups.length * 60) }}>
        <Timeline
          groups={groups}
          items={items}
          defaultTimeStart={timelineStart}
          defaultTimeEnd={timelineEnd}
          minZoom={24 * 60 * 60 * 1000} // 1 dzień
          maxZoom={365 * 24 * 60 * 60 * 1000} // 1 rok
          lineHeight={60}
          itemHeightRatio={0.75}
          canMove={false}
          canResize={false}
          canChangeGroup={false}
          stackItems={true}
        >
          <TimelineMarkers>
            <TodayMarker />
            <CustomMarker date={new Date(dateFrom).getTime()}>
              {({ styles }) => (
                <div
                  style={{
                    ...styles,
                    backgroundColor: '#10b981',
                    width: '2px',
                    zIndex: 1000
                  }}
                />
              )}
            </CustomMarker>
            <CustomMarker date={new Date(dateTo).getTime()}>
              {({ styles }) => (
                <div
                  style={{
                    ...styles,
                    backgroundColor: '#ef4444',
                    width: '2px',
                    zIndex: 1000
                  }}
                />
              )}
            </CustomMarker>
          </TimelineMarkers>
        </Timeline>
      </div>
      
      <style>{`
        .timeline-container .rct-item.timeline-item-conflict {
          background-color: rgba(248, 113, 113, 0.7) !important;
          border-color: rgba(248, 113, 113, 0.9) !important;
          border-width: 2px !important;
          box-shadow: 0 2px 4px rgba(248, 113, 113, 0.3) !important;
        }
        
        .timeline-container .rct-item.timeline-item-normal {
          background-color: rgba(96, 165, 250, 0.7) !important;
          border-color: rgba(96, 165, 250, 0.9) !important;
          box-shadow: 0 2px 4px rgba(96, 165, 250, 0.2) !important;
        }
        
        .timeline-container .rct-sidebar {
          background-color: rgba(20, 20, 30, 0.9) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(8px) !important;
        }
        
        .timeline-container .rct-sidebar-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.95) !important;
        }
        
        .timeline-container .rct-sidebar-row:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        
        .timeline-container .rct-header-root {
          background-color: rgba(15, 15, 25, 0.95) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(8px) !important;
        }
        
        .timeline-container .rct-calendar-header {
          background-color: rgba(15, 15, 25, 0.95) !important;
          color: rgba(255, 255, 255, 0.95) !important;
        }
        
        .timeline-container .rct-dateHeader {
          background-color: rgba(20, 20, 30, 0.9) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(8px) !important;
        }
        
        .timeline-container .rct-vertical-lines .rct-vl {
          border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        .timeline-container .rct-horizontal-lines .rct-hl {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </div>
  );
};

