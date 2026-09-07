import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/master-data': ['ADMIN'],
  '/dashboard/users': ['ADMIN'],
  '/dashboard/nc-clear': ['ADMIN', 'SUPERVISOR', 'REWORK'],
  '/dashboard/machine-test': ['ADMIN', 'SUPERVISOR'],
  '/dashboard/production': ['ADMIN', 'SUPERVISOR', 'PRODUCTION'],
  '/dashboard/report': ['ADMIN', 'SUPERVISOR', 'QUALITY', 'REPORT'],
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const userCookie = request.cookies.get('bat_mes_user')?.value;

  if (!userCookie) {
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  try {
    const userObj = JSON.parse(decodeURIComponent(userCookie));
    const userGroup = (userObj?.group_name || 'UNKNOWN').toUpperCase().trim();

    // Check permissions
    const sortedRoutes = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
    const matchedRoute = sortedRoutes.find((route) => pathname === route || pathname.startsWith(`${route}/`));

    if (matchedRoute) {
      const allowedRoles = ROUTE_PERMISSIONS[matchedRoute];
      if (!allowedRoles.includes(userGroup)) {
        // Redirect unauthorized direct URL entries back to main dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};