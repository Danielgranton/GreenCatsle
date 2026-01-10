import React, { useState } from 'react'
import ExploreMenu from './ExploreMenu'
import FoodDisplay from './FoodDisplay'

const MenuPage = ({category, setCategory}) => {
    

  return (
    <div>
      <ExploreMenu category={category} setCategory={setCategory}/>
      
      <FoodDisplay category={category}/>
    </div>
  )
}

export default MenuPage
