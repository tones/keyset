import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-white dark:bg-gray-900 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-6">Keysets</h1>
        <LoginForm />
      </div>
    </div>
  )
}
