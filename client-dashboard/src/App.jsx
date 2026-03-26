import React from 'react'
import ClientNavbar from './components/clientNavbar.jsx'
import HeroSection from './components/heresection.jsx'
import ClientMap from './components/clientMap.jsx'

const App = () => {
  return (
    <div className="min-h-screen bg-white">

      {/* navbar  */}
      <ClientNavbar />


    <div className='flex'>
      {/* main conten  */}
      <div className='w-2/3'>
        <HeroSection />
      </div>

      {/* map  */}
      <div className="w-1/3 h-[calc(100vh-64px)] sticky top-16 overflow-y-scroll border-l border-gray-600 p-2">
        <ClientMap />
      </div>
     </div> 
    </div>
  )
}

export default App
