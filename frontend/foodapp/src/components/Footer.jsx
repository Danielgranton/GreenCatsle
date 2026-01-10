import React from 'react'

const Footer = () => {
  return (
    <footer id='footer' className='px-10 p-10 bg-gray-600 mb-4 justify-center rounded-b-4xl mt-5  rounded-t-lg'>
        <div className='max-w-7xl mx-auto px-5 grid grid-cols-1 md:grid-cols-4 gap-10 cursor-pointer'>
          <div className='flex flex-col items-center justify-center'>
            <h2 className='font-bold text-2xl mb-5 text-orange-300'>Green Castle International(GCI)</h2>
            <p className='text-white'> Bringing you the freshest fruits, organic vegetables, and healthy
            groceries for a better and healthier lifestyle. We deliver quality
            straight to your doorstep.</p>
          </div>

          <div className='flex flex-col items-center justify-center cursor-pointer'>
            <h3 className='text-2xl font-bold mb-5 text-orange-300'>Quick links</h3>
            <ul className='text-yellow-500 text-1xl font-bold gap-5'>
              <li className='hover:text-yellow-700 duration-1000'>Home</li>
              <li className='hover:text-yellow-700 duration-1000'>Menu</li>
              <li className='hover:text-yellow-700 duration-1000'>About Us</li>
              <li className='hover:text-yellow-700 duration-1000'>Contact</li>
            </ul>
          </div>

          <div className='flex flex-col items-center justify-center cursor-pointer'>
            <h3 className='text-2xl font-bold mb-5 text-center text-orange-300'>Contact</h3>
              <div className='flex flex-col gap-5 text-white'>
                <div className='space-x-3'>
                  <i className='fa-solid fa-envelope text-3xl text-blue-300'></i>
                  <span>Email: info@greencastle.com</span>
                </div>
                <div className='space-x-3'>
                  <i className='fas fa-phone text-3xl text-blue-400'></i>
                  <span>Phone: +254 700 123 456</span>
                </div>
                <div className='space-x-3'>
                  <i className='fas fa-location-dot text-3xl text-blue-300'></i>
                  <span>Location: Bosaso, Somalia</span>
                </div>
              </div>
          </div>

          <div className='flex flex-col items-center justify-center cursor-pointer'>
            <h3 className='text-2xl font-bold mb-5 text-orange-300'>Follow us</h3>
              <div className='flex flex-col text-3xl'>
                  <a href=""><i className="fa-brands fa-facebook text-blue-500 transform hover:scale-125 duration-700"></i></a>
                  <a href=""><i className="fa-brands fa-twitter text-blue-300 transform hover:scale-125 duration-700"></i></a>
                  <a href=""><i className="fa-brands fa-square-instagram text-orange-400 transform hover:scale-125 duration-700"></i></a>
                  <a href=""> <i className="fa-solid fa-envelope text-blue-300 transform hover:scale-125 duration-700"></i></a>
              </div>
          </div>

          <div>
          </div>
        </div>
        <hr className='w-full bg-gray-500 mb-10 h-1 border-none'/>
        <div className=" text-center text-green-500 text-sm ">
               © {new Date().getFullYear()} Green Castle International. All rights reserved.
            </div> 
    </footer>
  )
}

export default Footer
