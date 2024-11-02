import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('Customer');
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState('');
  const [orderStatus, setOrderStatus] = useState(null);
  const [completedOrders, setCompletedOrders] = useState([]);

  
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await axios.get('http://localhost:5000/restaurants');
        setRestaurants(response.data);
      } catch (error) {
        console.error('Error fetching restaurants:', error);
      }
    };

    fetchRestaurants();
  }, []);

  
  const selectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const addToCart = (meal) => {
    setCart([...cart, { ...meal, restaurantName: selectedRestaurant.name }]);
    setTotal(total + meal.price);
  };

  const submitOrder = () => {
    const orderDetails = {
      items: cart,
      total: total.toFixed(2),
    };

    axios.post('http://localhost:5000/orders', orderDetails)
      .then(response => {
        alert('Order submitted successfully!');
        setCart([]);
        setTotal(0);
        setSelectedRestaurant(null);
      })
      .catch(error => {
        console.error('Error submitting the order!', error);
      });
  };

  
  const fetchOrders = () => {
    axios.get('http://localhost:5000/orders')
      .then(response => {
        setOrders(response.data);
      })
      .catch(error => console.error('Error fetching orders:', error));
  };

  useEffect(() => {
    if (activeTab === 'Stall') {
      fetchOrders();
    }
  }, [activeTab]);

  
  const updateOrderStatus = (orderId, restaurantName, status) => {
    axios.patch(`http://localhost:5000/orders/${orderId}/restaurant/${restaurantName}`, { status })
      .then(response => {
        setOrders(orders.map(order =>
          order._id === orderId ? response.data : order
        ));
        alert(`Order from ${restaurantName} marked as ${status}!`);
      })
      .catch(error => {
        console.error('Error updating order status!', error);
      });
  };

  
  const markOrderAsReady = (orderId, restaurantName) => {
    updateOrderStatus(orderId, restaurantName, 'Ready');
  };

  
  const checkOrderCompletion = async (orderId) => {
    try {
      const response = await axios.get(`http://localhost:5000/orders/${orderId}/check-complete`);
      if (response.data.complete) {
        setCompletedOrders([...completedOrders, orderId]);
      }
    } catch (error) {
      console.error('Error checking order completion', error);
    }
  };

  
  const checkOrderStatus = () => {
    axios.get(`http://localhost:5000/orders/${orderId}`)
      .then(response => setOrderStatus(response.data))
      .catch(() => alert('Order not found!'));
  };

  return (
    <div className="App">
      <header>
        <h1>Food App</h1>
      </header>

      <div className="sidebar">
        <ul>
          <li onClick={() => setActiveTab('Customer')} className={activeTab === 'Customer' ? 'active' : ''}>Customer</li>
          <li onClick={() => setActiveTab('Stall')} className={activeTab === 'Stall' ? 'active' : ''}>Stall</li>
          <li onClick={() => setActiveTab('Display')} className={activeTab === 'Display' ? 'active' : ''}>Display</li>
        </ul>
      </div>

      <main>
        {activeTab === 'Customer' && (
          <div>
            {selectedRestaurant === null ? (
              <div className="restaurant-section">
                <h2>Select a Restaurant</h2>
                <ul>
                  {restaurants.map((restaurant) => (
                    <li key={restaurant._id} onClick={() => selectRestaurant(restaurant)}>
                      {restaurant.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="meal-section">
                <h2>{selectedRestaurant.name}</h2>
                <ul>
                  {selectedRestaurant.menu.map((meal, index) => (
                    <li key={index}>
                      {meal.name} - ₹{meal.price.toFixed(2)}
                      <button onClick={() => addToCart(meal)}>Add to Cart</button>
                    </li>
                  ))}
                </ul>
                <button onClick={() => setSelectedRestaurant(null)}>Back to Restaurants</button>
              </div>
            )}

            <div className="cart-section">
              <h2>Cart</h2>
              <ul>
                {cart.map((meal, index) => (
                  <li key={index}>{meal.name} - ₹{meal.price.toFixed(2)} from {meal.restaurantName}</li>
                ))}
              </ul>
              <p>Total: ₹{total.toFixed(2)}</p>
              <button onClick={submitOrder} disabled={cart.length === 0}>Submit Order</button>
            </div>
          </div>
        )}


{activeTab === 'Stall' && (
  <div>
    <h2>Stall Dashboard</h2>
    {restaurants.map(restaurant => (
      <div key={restaurant._id} className="restaurant-section">
        <h3>{restaurant.name}</h3>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Items</th>
              <th>Total</th>
              <th>Restaurant Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders
              .filter(order =>
                order.items.some(item => item.restaurantName === restaurant.name)
              )
              .map(order => {
                const filteredItems = order.items.filter(item => item.restaurantName === restaurant.name);
                const restaurantStatus = order.restaurantStatuses.find(rs => rs.restaurantName === restaurant.name)?.status;

                return (
                  <tr key={order._id}>
                    <td>{order._id}</td>
                    <td>
                      <ul>
                        {filteredItems.map((item, index) => (
                          <li key={index}>
                            {item.name} - ₹{item.price} - {item.status}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>₹{order.total}</td>
                    <td>{restaurantStatus}</td>
                    <td>
                      
                      {restaurantStatus === 'Preparing' ? (
                        <button onClick={() => markOrderAsReady(order._id, restaurant.name)}>Mark as Ready</button>
                      ) : restaurantStatus === 'Ready' ? (
                        <button disabled>Order Ready</button>
                      ) : (
                        <button onClick={() => updateOrderStatus(order._id, restaurant.name, 'Preparing')}>Accept Order</button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    ))}
  </div>
)}

{activeTab === 'Display' && (
  <div>
    <h2>Order Status Display</h2>
    <table>
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Restaurants</th>
          <th>Items (Grouped by Restaurant)</th>
          <th>Restaurant Status</th>
          <th>Complete Status</th>
        </tr>
      </thead>
      <tbody>
        {orders
          .sort((a, b) => completedOrders.includes(a._id) ? -1 : 1) 
          .map(order => {
            const allReady = order.restaurantStatuses.every(rs => rs.status === 'Ready'); 
            return (
              <tr key={order._id}>
                <td>{order._id}</td>
                <td>
                  <ul>
                    {order.restaurantStatuses.map((rs, index) => (
                      <li key={index}>{rs.restaurantName} - {rs.status}</li>
                    ))}
                  </ul>
                </td>
                <td>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={index}>
                        {item.name} - {item.restaurantName} - {item.status}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  {order.restaurantStatuses.map((rs, index) => (
                    <p key={index}>{rs.restaurantName}: {rs.status}</p>
                  ))}
                </td>
                <td>
                  {allReady ? 'Complete' : ''} 
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
)}

      </main>
    </div>
  );
}

export default App;
