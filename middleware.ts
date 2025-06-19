// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { supabase } from './app/lib/supabaseClient';
import { NextResponse } from 'next/server';

// Define routes that should remain publicly accessible
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/public(.*)',  // add other open routes if needed
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes by default
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { userId } = await auth();

  // Ensure userId is valid
  if (!userId) {
    return; // Exit quietly if userId is invalid
  }

  console.log('User Info:', {
    userId,
    url: req.url
  });

  // Check if user exists
  const { data: existingUser, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking user:', error);
  }

  // If user does not exist, insert new user
  if (!existingUser) {
    const { error: insertError } = await supabase
      .from('users')
      .insert([
        { clerk_id: userId }
      ]);

    if (insertError) {
      console.error('Error inserting user:', insertError);
    } else {
      console.log('User inserted successfully');
    }
  }

  // After ensuring userId is valid
  // Look up the UUID from the users table where clerk_id = userId
  const { data: userRow, error: userRowError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .maybeSingle();

  if (userRow && userRow.id) {
    // Set the user_id cookie to the UUID
    const response = NextResponse.next();
    response.cookies.set('user_id', userRow.id, { secure: true, sameSite: 'strict', path: '/' });
    return response;
  }
});

export const config = {
  matcher: [
    // Protect all non-static, non-internal routes
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always include API/trpc routes
    '/(api|trpc)(.*)',
  ],
};
