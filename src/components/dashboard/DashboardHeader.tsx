// src/components/dashboard/DashboardHeader.tsx: Komponent layoutowy nagłówka z logo i kontenerem formularza

import React from 'react';

interface DashboardHeaderProps {
  children: React.ReactNode;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ children }) => {
  return (
    <div className="w-full max-w-[1100px] h-auto bg-[#386BB2] flex flex-col items-center justify-center p-4 lg:p-6 mx-auto gap-6">
      {/* Logo "narty poznań" - POWIĘKSZONE okrągłe logo z cieniem */}
      <div className="flex items-center justify-center">
        <img 
          src="/images/logo.png" 
          alt="Narty Poznań Logo" 
          className="w-[220px] h-[220px] rounded-full object-cover shadow-2xl"
          style={{ clipPath: 'circle(50%)' }}
        />
      </div>
      
      {/* Main Content Container - POWIĘKSZONY - responsywny - dopasowuje się do zawartości */}
      <div className="w-auto h-auto bg-[#194576] rounded-[20px] flex flex-col lg:flex-row items-stretch justify-start gap-3 p-3 lg:p-2" style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)' }}>
        {children}
      </div>
    </div>
  );
};

export default DashboardHeader;




