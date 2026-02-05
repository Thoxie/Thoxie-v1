import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to the Small Claims Court Application
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A unified platform to manage your small claims court cases efficiently
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Intake Wizard Card */}
        <Link href="/intake" className="block">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition border-2 border-transparent hover:border-blue-500">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Intake Wizard</h2>
            </div>
            <p className="text-gray-600">
              Start a new case by filling out the intake form. Our step-by-step wizard will guide you through the process.
            </p>
            <div className="mt-4 text-blue-600 font-medium">
              Start New Case →
            </div>
          </div>
        </Link>

        {/* Dashboard Card */}
        <Link href="/dashboard" className="block">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition border-2 border-transparent hover:border-blue-500">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Case Dashboard</h2>
            </div>
            <p className="text-gray-600">
              View and manage all your active cases. Track status, view documents, and monitor progress.
            </p>
            <div className="mt-4 text-green-600 font-medium">
              View Dashboard →
            </div>
          </div>
        </Link>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg p-8 mb-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              1
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">File Your Claim</h4>
            <p className="text-gray-600 text-sm">
              Use the Intake Wizard to provide case details and submit your claim
            </p>
          </div>
          <div className="text-center">
            <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              2
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Track Progress</h4>
            <p className="text-gray-600 text-sm">
              Monitor your case status and updates through the dashboard
            </p>
          </div>
          <div className="text-center">
            <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              3
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Manage Documents</h4>
            <p className="text-gray-600 text-sm">
              Upload, view, and organize all case-related documents
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">Fast</div>
          <p className="text-gray-600">Streamlined case filing process</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">Secure</div>
          <p className="text-gray-600">Your data is protected and confidential</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">Simple</div>
          <p className="text-gray-600">Easy-to-use interface for everyone</p>
        </div>
      </div>
    </div>
  )
}
