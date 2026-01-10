import React from 'react'
import {menu} from '../data/Menu'

const ExploreMenu = ({category, setCategory}) => {
  return (
    <div className='p-4 sm:p-6 lg:p-10 '>
      <h1 className='font-bold text-3xl font-poppins  text-green-400  cursor-pointer sm:text-3xl lg:text-4xl sm:text-left' >Explore our menu</h1>
      <p className='text-1xl  text-black mt-5 '>Explore our delicious range of fresh fruits and organic produce. 
    Handpicked daily to bring you the best taste and nutrition, straight from the farm to your table.</p>

    
      <div className='flex space-x-3 overflow-x-auto p-4 hide-scrollbar '>
        {menu.map((item) => (
          <div onClick={() =>setCategory( prev => prev===item.name? "All" : item.name)} 
          key={item.id} className='mt-3   text-center'>
            <img src= {item.image} alt= {item.name}  className={`mt-4 h-24 w-24 rounded-full object-cover min-w-[100px] flex-shrink-0 shadow-lg shadow-black transform hover:scale-110 duration-600 cursor-pointer ${category === item.name? "ring-3 ring-yellow-400 " : ""} `}/>
            <h4 className='mt-2 capitalize 
            text-black transform hover:scale-125 duration-600 cursor-pointer text-1xl sm:text-base'>{item.name}</h4>
          </div>
        ))}
      </div>
      <hr className="w-full my-4 border-gray-600" />
    </div>
  )
}

export default ExploreMenu
