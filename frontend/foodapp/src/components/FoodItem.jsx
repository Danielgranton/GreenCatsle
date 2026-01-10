import React, { useContext } from 'react'
import StarRating from './StarRating'
import { Link } from 'react-router-dom'
import { StoreContext } from '../context/StoreContext'

const FoodItem = ({ id, name, price, description, image, rating }) => {
  const { url } = useContext(StoreContext);

  return (
    <Link to={`/food/${id}`} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col h-[270px] cursor-pointer">
      {/* Image with overflow */}
      <div className='relative'>
        <div className='h-[150px] w-full'>
          <img className='w-full h-full object-cover hover:scale-115 duration-300' src={`${url}/images/${image}`} alt={name} />
        </div>

        {/* price */}
        <div className='absolute bottom-2 right-2'>
          <p className='bg-white p-2 rounded-lg text-green-600 font-bold text-base sm:text-sm md:text-sm lg:text-sm shadow-md'>
            Ksh {price}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className='p-3 flex-1'>
        <div className='flex justify-between items-center'>
          <h3 className='capitalize text-gray-800 font-semibold text-sm md:text-base'>{name}</h3>
          <StarRating rating={rating} />
        </div>
        <p className='text-gray-600 text-xs md:text-sm mt-1 text-center line-clamp-2'>{description}</p>
      </div>
    </Link>
  )
}

export default FoodItem
