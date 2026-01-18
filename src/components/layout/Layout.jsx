import Navbar from './Navbar';
import logo from '../../assets/logo.png';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 md:pb-0 font-sans">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-center items-center sticky top-0 z-10">
        <img src={logo} alt="Dinnr" className="h-8 w-auto mr-2" />
        <span className="text-lg font-bold text-orange-600">Dinnr</span>
      </div>

      {/* Main Content Area */}
      <main className="max-w-screen-md mx-auto p-4 md:p-8">
        {children}
      </main>

      {/* Navigation */}
      <Navbar />
    </div>
  );
}