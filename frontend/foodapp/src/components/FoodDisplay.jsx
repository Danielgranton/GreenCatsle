import React, { useContext } from 'react'
import { StoreContext } from '../context/StoreContext'
import FoodItem from './FoodItem'

const FoodDisplay = ({category}) => {

    const {food_list, searchQuery, filteredFoodList} = useContext(StoreContext)

    const normalise =  value => value?.toString().trim().toLowerCase();
  return (
    <div  className='px-4 sm:px-6 lg:px-10  '>
      <h2 className='text-green-600 font-bold text-2xl sm:text-3xl lg:text-3xl mb-6 text-center sm:text-left'>Pick your favourite dish near you</h2>
      <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-3'>

        {(searchQuery ? filteredFoodList : food_list)
        .filter(item => 
          category === "All" ||
          normalise(item.category) === normalise(category)
        )
        .map(item => (
          <FoodItem
            key={item._id}
            id ={item._id}
            name={item.name}
            price={item.price}
            image={item.image}
            description={item.description}
            rating={item.rating}
          />
        ))
        }
      </div>
    </div>
  )
}

export default FoodDisplay
