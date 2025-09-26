import React from "react";
import logo from '../assets/Logonew.png'; // import from assets

const Navbar = () => (
  <div className="w-full bg-white pt-6 pb-3 border-b-0">
    <div className="relative flex items-center justify-center px-2 md:px-4 max-w-full">
      {/* Logo at far left, vertically centered */}
      <div className="absolute left-2 md:left-6 flex items-center h-full">
        <img
          src={logo}                   // USE THE IMPORTED VARIABLE
          alt="RGUKT Logo"
          className="h-20 w-20 object-contain"
          style={{ minWidth: "80px" }}
        />
      </div>
      {/* ...rest of the code unchanged... */}
      <div className="flex flex-col items-center w-full">
        <div className="text-[#991b1b] font-bold text-2xl md:text-3xl leading-snug text-center w-full">
          Rajiv Gandhi University of Knowledge Technologies-Andhra Pradesh
        </div>
        <div className="font-bold text-[#22235b] text-lg md:text-xl mb-1 text-center w-full">
          RK Valley Campus
        </div>
        <div className="text-sm text-gray-600 font-normal text-center w-full">
          (Established by the Govt. of Andhra Pradesh and recognized as per Section 2(f), 12(B) of UGC Act, 1956)
        </div>
      </div>
      <div className="absolute right-2 md:right-6 h-20 w-20" style={{ minWidth: "80px" }} />
    </div>
    <div className="w-full border-b-4 border-yellow-500 mt-2"></div>
  </div>
);

export default Navbar;
