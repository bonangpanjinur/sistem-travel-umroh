import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Automatically scrolls the page to the top when the route changes
 * This prevents the page from staying scrolled down when navigating to new pages
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top of the page
    window.scrollTo(0, 0);
    
    // Also scroll any scrollable containers to top
    // Note: must include overflow-y-auto (used by admin layout main content area)
    const scrollableElements = document.querySelectorAll(
      '[class*="overflow-y-auto"], [class*="overflow-auto"], [class*="scroll"], main, [role="main"]'
    );
    scrollableElements.forEach((element) => {
      if (element.scrollTop !== 0) {
        element.scrollTop = 0;
      }
    });
  }, [pathname]);

  return null;
}
