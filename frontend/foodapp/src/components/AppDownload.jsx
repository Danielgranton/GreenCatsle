import React from 'react'

const AppDownload = () => {
  return (
    <div id='mobile' className='flex flex-col items-center justify-center  '>
      <div className=' rounded-lg  flex flex-col items-center justify-center w-full md:w-3/4 lg:w-1/2 ' >
        <p className='text-sm md:text-1xl  text-black font-bold text-center w-full'>For Better Experience Download  Green Catsle App</p>

      <div className='flex flex-col md:flex-row space-y-4 md:space-y-0 space-x-10 mt-4 cursor-pointer w-full md:w-auto justify-center'>
        <div className='flex items-center justify-center gap-4 bg-black p-2 rounded-lg hover:scale-105 transform duration-300 w-full md:w-auto mb-5'>
            <i className="fa-brands fa-google-play text-2xl text-white "></i>
            <span>
                <p className='text-sm text-white'>Get it on</p>
                <h4 className='font-bold text-xl md:text-1xl text-gray-300'> Google Play</h4>
            </span>
        </div>
        <div className='flex items-center justify-center gap-4 bg-black p-2 rounded-lg hover:scale-105 transform duration-300 w-full md:w-auto mb-5'>
            <i className="fa-brands fa-apple text-white text-2xl"></i>
            <span>
                <h3 className='text-sm text-white'>Download on the</h3>
                <h4 className='font-bold text-xl md:text-1xl text-gray-300'>App Store</h4>
            </span>
        </div>
      </div>
      </div>
    </div>
  )
}

export default AppDownload
