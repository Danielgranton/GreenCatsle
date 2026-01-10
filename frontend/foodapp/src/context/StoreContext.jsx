import { createContext, useEffect, useState, useCallback } from "react";
import {jwtDecode} from "jwt-decode";
import axios from "axios";

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {

    const[cartItems, setCartItems] = useState({});
    const url = "http://localhost:4000"
    const [token, setToken] = useState("");
    const [ user,setUser] = useState(null);
    const [food_list, setFoodList] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    // delivery info


    // add to cart function
    const addToCart = async (itemId) => {
        if(!cartItems[itemId]){
            setCartItems((prev) => ({...prev,[itemId] : 1}))
        }
        else{
            setCartItems((prev) => ({...prev,[itemId] : prev[itemId] + 1}))
        }

        if(token){

            await axios.post(url+"/api/cart/add", { itemId }, {
                headers : {
                    Authorization : `Bearer ${token}`
                }
            });
        }
    }

     const removeFromCart = async (itemId) => {
        setCartItems((prev) => ({...prev,[itemId] : prev[itemId] - 1}));

        if(token){
            await axios.post(url+"/api/cart/remove", {itemId}, {headers: {
                Authorization: `Bearer ${token}`
                }
            });
        }
     }


     const fetchFoodList = async () => {
        const response = await axios.get(url+"/api/food/list");
        setFoodList(response.data.data);
     }

     const filteredFoodList = food_list.filter(item =>
  item.name.toLowerCase().includes(searchQuery.toLowerCase())
);

     const addToRecentlyViewed = useCallback((itemId) => {
        setRecentlyViewed(prev => {
            const newList = [itemId, ...prev.filter(id => id !== itemId)].slice(0, 5);
            return newList;
        });
     }, []);

     const loadCartData = async (token) => {

        try {
            const response = await axios.post(
                url+"/api/cart/get",
                {},
                {
                    headers : {
                        Authorization : `Bearer ${token}`
                    }  
                }
            );

            setCartItems(response.data.cartData || {});
        } catch (error) {
            console.error(error);
            
        }
     }

   


    useEffect(() => {
        if (token) {
            try {
            const decoded = jwtDecode(token);
                console.log(decoded);
            setUser({
                id: decoded.id,
                role: decoded.role,   // ✅ FROM JWT
                name: decoded.name || "",
                email: decoded.email || "",
            });

            } catch (error) {
            console.log("Token decode error:", error);
            setUser(null);
            }
        }
    }, [token]);

        const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        setToken("");   // clear token state
        setUser(null);  // clear user state
        };

     // load token from storage on page refresh
     useEffect(() => {
       
        async function loadData  (){
            await fetchFoodList();

            const storedToken = localStorage.getItem("token");
            if(storedToken) {
                setToken(storedToken);

                await loadCartData(localStorage.getItem("token"));
            }
        }

        loadData();
        
     }, []);


     // console.log("User role", user?.role);
     useEffect(() => {
        // console.log(cartItems)
     },[cartItems])

    const contextValue = {
        food_list,
        cartItems,
        setCartItems,
        addToCart,
        removeFromCart,
        url,
        setToken,
        token,
        user,
        setUser,
        logout,
        searchQuery,
        setSearchQuery,
        filteredFoodList,
        recentlyViewed,
        addToRecentlyViewed,
    }

    return (
        <StoreContext.Provider value={contextValue}>
            {props.children}
        </StoreContext.Provider>
    );
}

export default StoreContextProvider;
