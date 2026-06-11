import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIAccessProvider } from "@/contexts/AIAccessContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Orders = lazy(() => import("./pages/Orders"));
const Returns = lazy(() => import("./pages/Returns"));
const Settlements = lazy(() => import("./pages/Settlements"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Invoices = lazy(() => import("./pages/Invoices"));
const ProductHealth = lazy(() => import("./pages/ProductHealth"));
const ConsolidatedOrders = lazy(() => import("./pages/ConsolidatedOrders"));
const SKUMapping = lazy(() => import("./pages/SKUMapping"));
const Reconciliation = lazy(() => import("./pages/Reconciliation"));
const DataImport = lazy(() => import("./pages/DataImport"));
const SocialInsights = lazy(() => import("./pages/SocialInsights"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Support = lazy(() => import("./pages/Support"));
const Vendors = lazy(() => import("./pages/Vendors"));
const Warehouses = lazy(() => import("./pages/Warehouses"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AIChatbot = lazy(() => import("./pages/AIChatbot"));
const OwnWebsite = lazy(() => import("./pages/OwnWebsite"));
const Permissions = lazy(() => import("./pages/Permissions"));
const Reports = lazy(() => import("./pages/Reports"));
const PricePayout = lazy(() => import("./pages/PricePayout"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DataConfiguration = lazy(() => import("./pages/DataConfiguration"));
const SystemArchitecture = lazy(() => import("./pages/SystemArchitecture"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));
const FinanceTaxation = lazy(() => import("./pages/FinanceTaxation"));
const APISettings = lazy(() => import("./pages/APISettings"));
const VideoManagement = lazy(() => import("./pages/VideoManagement"));
const LegalCompliance = lazy(() => import("./pages/LegalCompliance"));
const LeadManagement = lazy(() => import("./pages/LeadManagement"));
const WhatsAppAPI = lazy(() => import("./pages/WhatsAppAPI"));
const BusinessOnboarding = lazy(() => import("./pages/BusinessOnboarding"));
const CustomerManagement = lazy(() => import("./pages/CustomerManagement"));
const Insights = lazy(() => import("./pages/Insights"));
const MarketingConfig = lazy(() => import("./pages/MarketingConfig"));
const ExpenseTracking = lazy(() => import("./pages/ExpenseTracking"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const TechnicalDocs = lazy(() => import("./pages/TechnicalDocs"));
const ProfitCalculator = lazy(() => import("./pages/ProfitCalculator"));
const PayoutComparison = lazy(() => import("./pages/PayoutComparison"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Broadcast = lazy(() => import("./pages/Broadcast"));
const PurchaseManagement = lazy(() => import("./pages/PurchaseManagement"));
const ReviewRatingAnalytics = lazy(() => import("./pages/ReviewRatingAnalytics"));
const GoogleMapsScraper = lazy(() => import("./pages/GoogleMapsScraper"));
const EmailSocialMarketing = lazy(() => import("./pages/EmailSocialMarketing"));
const GoogleMeetIntegration = lazy(() => import("./pages/GoogleMeetIntegration"));
const StorageDashboard = lazy(() => import("./pages/StorageDashboard"));
const AILearningUpgrade = lazy(() => import("./pages/AILearningUpgrade"));
const ChannelManagement = lazy(() => import("./pages/ChannelManagement"));
const Brands = lazy(() => import("./pages/Brands"));
const ProductsCatalog = lazy(() => import("./pages/ProductsCatalog"));
const Affiliated = lazy(() => import("./pages/Affiliated"));
const ReconciliationHub = lazy(() => import("./pages/ReconciliationHub"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AIAccessProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #F2EAF7 0%, #e8d8f0 30%, #f0e6f5 60%, #F2EAF7 100%)' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
          }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/insights" replace />} />
            <Route path="/dashboard" element={<Navigate to="/insights" replace />} />
            <Route path="/channels" element={<AppLayout><ChannelManagement /></AppLayout>} />
            <Route path="/brands" element={<AppLayout><Brands /></AppLayout>} />
            <Route path="/products-catalog" element={<AppLayout><ProductsCatalog /></AppLayout>} />
            <Route path="/products" element={<Navigate to="/products-catalog" replace />} />
            <Route path="/catalog-manager" element={<Navigate to="/products-catalog" replace />} />
            <Route path="/product-health" element={<AppLayout><ProductHealth /></AppLayout>} />
            <Route path="/inventory" element={<AppLayout><Inventory /></AppLayout>} />
            <Route path="/orders" element={<AppLayout><Orders /></AppLayout>} />
            <Route path="/consolidated-orders" element={<AppLayout><ConsolidatedOrders /></AppLayout>} />
            <Route path="/returns" element={<AppLayout><Returns /></AppLayout>} />
            <Route path="/invoices" element={<AppLayout><Invoices /></AppLayout>} />
            <Route path="/employees" element={<Navigate to="/staff" replace />} />
            <Route path="/settlements" element={<AppLayout><Settlements /></AppLayout>} />
            <Route path="/sku-mapping" element={<AppLayout><SKUMapping /></AppLayout>} />
            <Route path="/reconciliation" element={<AppLayout><ReconciliationHub /></AppLayout>} />
            <Route path="/stock-reconciliation" element={<AppLayout><ReconciliationHub /></AppLayout>} />
            <Route path="/affiliated" element={<AppLayout><Affiliated /></AppLayout>} />
            <Route path="/data-import" element={<AppLayout><DataImport /></AppLayout>} />
            <Route path="/social-insights" element={<AppLayout><SocialInsights /></AppLayout>} />
            <Route path="/subscription" element={<AppLayout><Subscription /></AppLayout>} />
            <Route path="/support" element={<AppLayout><Support /></AppLayout>} />
            <Route path="/alerts" element={<AppLayout><Alerts /></AppLayout>} />
            <Route path="/vendors" element={<AppLayout><Vendors /></AppLayout>} />
            <Route path="/warehouses" element={<AppLayout><Warehouses /></AppLayout>} />
            <Route path="/tasks" element={<AppLayout><Tasks /></AppLayout>} />
            <Route path="/analytics" element={<AppLayout><Analytics /></AppLayout>} />
            <Route path="/ecommerce" element={<AppLayout><OwnWebsite /></AppLayout>} />
            <Route path="/chatbot" element={<AppLayout><AIChatbot /></AppLayout>} />
            <Route path="/permissions" element={<AppLayout><Permissions /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
            <Route path="/price-payout" element={<AppLayout><PricePayout /></AppLayout>} />
            <Route path="/review-rating-analytics" element={<Navigate to="/review-analytics" replace />} />
            <Route path="/settings" element={<Navigate to="/permissions" replace />} />
            <Route path="/data-configuration" element={<Navigate to="/system-settings" replace />} />
            <Route path="/system-architecture" element={<Navigate to="/system-settings" replace />} />
            <Route path="/system-settings" element={<AppLayout><SystemSettings /></AppLayout>} />
            <Route path="/finance" element={<AppLayout><FinanceTaxation /></AppLayout>} />
            <Route path="/api-settings" element={<AppLayout><APISettings /></AppLayout>} />
            <Route path="/video-management" element={<AppLayout><VideoManagement /></AppLayout>} />
            <Route path="/legal-compliance" element={<AppLayout><LegalCompliance /></AppLayout>} />
            <Route path="/leads" element={<AppLayout><LeadManagement /></AppLayout>} />
            <Route path="/whatsapp" element={<AppLayout><WhatsAppAPI /></AppLayout>} />
            <Route path="/onboarding" element={<AppLayout><BusinessOnboarding /></AppLayout>} />
            <Route path="/customers" element={<AppLayout><CustomerManagement /></AppLayout>} />
            <Route path="/insights" element={<AppLayout><Insights /></AppLayout>} />
            <Route path="/marketing-config" element={<AppLayout><MarketingConfig /></AppLayout>} />
            <Route path="/expenses" element={<AppLayout><ExpenseTracking /></AppLayout>} />
            <Route path="/staff" element={<AppLayout><StaffManagement /></AppLayout>} />
            <Route path="/technical-docs" element={<AppLayout><TechnicalDocs /></AppLayout>} />
            <Route path="/broadcast" element={<AppLayout><Broadcast /></AppLayout>} />
            <Route path="/profit-calculator" element={<Navigate to="/price-payout" replace />} />
            <Route path="/payout-comparison" element={<Navigate to="/price-payout" replace />} />
            <Route path="/ai-learning" element={<Navigate to="/chatbot" replace />} />
            <Route path="/integrations" element={<AppLayout><Integrations /></AppLayout>} />
            <Route path="/purchase" element={<AppLayout><PurchaseManagement /></AppLayout>} />
            <Route path="/review-analytics" element={<AppLayout><ReviewRatingAnalytics /></AppLayout>} />
            <Route path="/data-intelligence" element={<AppLayout><GoogleMapsScraper /></AppLayout>} />
            <Route path="/email-marketing" element={<AppLayout><EmailSocialMarketing /></AppLayout>} />
            <Route path="/google-meet" element={<AppLayout><GoogleMeetIntegration /></AppLayout>} />
            <Route path="/storage" element={<AppLayout><StorageDashboard /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        </AIAccessProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
