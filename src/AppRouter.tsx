import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import Begin from "./pages/Begin";
import Graph from "./pages/Graph";
import GraphOnePager from "./pages/GraphOnePager";
import Unlock from "./pages/Unlock";
import PrivacyCenter from "./pages/PrivacyCenter";
import Settings from "./pages/Settings";
import AboutMethod from "./pages/AboutMethod";
import About from "./pages/About";
import LegalPrivacy from "./pages/LegalPrivacy";
import LegalTerms from "./pages/LegalTerms";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/begin" element={<Begin />} />
        <Route path="/graph" element={<Graph />} />
        <Route path="/graph/onepager" element={<GraphOnePager />} />
        <Route path="/unlock" element={<Unlock />} />
        <Route path="/privacy-center" element={<PrivacyCenter />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about/method" element={<AboutMethod />} />
        <Route path="/about" element={<About />} />
        <Route path="/legal/privacy" element={<LegalPrivacy />} />
        <Route path="/legal/terms" element={<LegalTerms />} />

        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
