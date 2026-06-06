export function ServiceCarouselSkeleton() {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="h-10 w-80 bg-muted rounded-lg animate-pulse mx-auto mb-4" />
          <div className="h-6 w-48 bg-muted rounded-lg animate-pulse mx-auto" />
        </div>
        <div className="flex justify-center gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-[350px] h-[420px] rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
