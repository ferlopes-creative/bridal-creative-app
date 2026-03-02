function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <div className="min-h-screen w-full bg-background">
            
            {/* Layout Responsivo Global */}
            <div className="
              w-full 
              mx-auto 
              px-4 
              md:px-8 
              lg:px-16 
              xl:px-24
            ">
              <Router />
            </div>

            <Toaster />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
