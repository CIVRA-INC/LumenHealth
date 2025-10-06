import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter an email and password");
        }

        // Call our backend login API
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          }
        );

        if (!res.ok) {
          // You can throw an error with the message from the API
          const errorData = await res.json();
          throw new Error(errorData.message || "Invalid credentials");
        }

        const user = await res.json();

        // The user object returned from our backend should contain the token and user details
        // We return this object to be used in the JWT and session callbacks
        if (user) {
          return user;
        } else {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // This callback is called whenever a JWT is created or updated.
    async jwt({ token, user }: { token: JWT; user?: unknown }) {
      // The `user` object is the one returned from the `authorize` function.
      // We are adding the backend token and user role to the next-auth token.
      if (user && typeof user === 'object' && 'token' in user && 'user' in user) {
        const authUser = user as { token: string; user: { role: string; id: string } };
        (token as JWT & { accessToken?: string; role?: string; id?: string }).accessToken = authUser.token;
        (token as JWT & { accessToken?: string; role?: string; id?: string }).role = authUser.user.role;
        (token as JWT & { accessToken?: string; role?: string; id?: string }).id = authUser.user.id;
      }
      return token;
    },
    // This callback is called whenever a session is checked.
    async session({ session, token }: { session: Session; token: JWT }) {
      // We are adding the data from the token (set in the jwt callback) to the session object.
      // This makes it available on the client-side.
      const extendedToken = token as JWT & { accessToken?: string; role?: string; id?: string };
      (session as Session & { accessToken?: string }).accessToken = extendedToken.accessToken;
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = extendedToken.role;
        (session.user as { role?: string; id?: string }).id = extendedToken.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login", // Redirect users to our custom login page
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
