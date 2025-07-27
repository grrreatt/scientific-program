import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Scientific Conference Scheduler
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Welcome Organizer - Modern conference program management
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Admin Login
            </Link>
            <Link 
              href="/public-program"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              View Program
            </Link>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">Dynamic Session Types</h3>
              <p className="text-gray-600">
                Support for lectures, panels, workshops, symposiums, and more with intelligent form fields.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">Real-time Updates</h3>
              <p className="text-gray-600">
                Instant synchronization across all devices with live updates and conflict detection.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">Export & Print</h3>
              <p className="text-gray-600">
                Generate CSV exports and beautiful print-friendly program views.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 