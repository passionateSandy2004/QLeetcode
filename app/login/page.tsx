import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Welcome to LeetCode Clone
        </h1>
        <SignIn
          appearance={{
            baseTheme: dark,
            elements: {
              formButtonPrimary: 
                "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
              card: "bg-transparent shadow-none",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton: 
                "bg-white border-gray-300 text-gray-700 hover:bg-gray-50",
              formFieldInput: 
                "bg-gray-700 border-gray-600 text-white focus:border-blue-500",
              formFieldLabel: "text-gray-300",
              footerActionLink: "text-blue-500 hover:text-blue-600",
            },
          }}
          afterSignInUrl="/"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
} 