function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <div className="min-h-screen w-full bg-background">
            <div className="w-full max-w-6xl mx-auto px-4 md:px-10">
              <Router />
            </div>
            <Toaster />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}