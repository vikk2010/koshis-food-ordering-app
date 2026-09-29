import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RequireUser from './components/RequireUser.jsx'
import Menu from './pages/Menu.jsx'
import Cart from './pages/Cart.jsx'
import Login from './pages/Login.jsx'
import TrackOrder from './pages/TrackOrder.jsx'
import Account from './pages/Account.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import DishForm from './pages/admin/DishForm.jsx'
import AdminRestaurant from './pages/admin/AdminRestaurant.jsx'
import AdminSections from './pages/admin/AdminSections.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'
import AdminOrderDetail from './pages/admin/AdminOrderDetail.jsx'
import AdminReports from './pages/admin/AdminReports.jsx'
import AdminRiders from './pages/admin/AdminRiders.jsx'
import RiderApp from './pages/rider/RiderApp.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/login" element={<Login />} />
          <Route element={<RequireUser />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders/:id" element={<TrackOrder />} />
            <Route path="/account" element={<Account />} />
          </Route>
          <Route path="/rider" element={<RiderApp />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/restaurant" element={<AdminRestaurant />} />
            <Route path="/admin/sections" element={<AdminSections />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/riders" element={<AdminRiders />} />
            <Route path="/admin/dishes/new" element={<DishForm />} />
            <Route path="/admin/dishes/:id/edit" element={<DishForm />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
