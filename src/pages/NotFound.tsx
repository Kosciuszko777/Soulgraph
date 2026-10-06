import { useSeoMeta } from "@unhead/react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AtlasLayout } from "@/components/shell/AtlasLayout";
import { SoulGraphMark } from "@/components/brand/SoulGraphMark";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useSeoMeta({
    title: "Off the map · SoulGraph",
    description: "This coordinate isn't on the atlas. Return to familiar stars.",
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <AtlasLayout>
      <section className="atlas-grid-bg relative">
        <div className="atlas-starfield absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="container relative flex min-h-[60vh] flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
          <SoulGraphMark className="h-10 w-10 text-muted-foreground/70" />
          <p className="atlas-label mt-6">404 · uncharted</p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl">Off the map</h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            This coordinate isn&rsquo;t on the atlas. Let&rsquo;s return to familiar stars.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/">Back to SoulGraph</Link>
          </Button>
        </div>
      </section>
    </AtlasLayout>
  );
};

export default NotFound;
