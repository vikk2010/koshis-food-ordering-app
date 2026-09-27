import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { DishProvider } from './context/DishContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { RestaurantProvider } from './context/RestaurantContext.jsx'
import { OrderProvider } from './context/OrderContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <SettingsProvider>
            <RestaurantProvider>
              <DishProvider>
                <CartProvider>
                  <OrderProvider>
                    <App />
                  </OrderProvider>
                </CartProvider>
              </DishProvider>
            </RestaurantProvider>
          </SettingsProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
