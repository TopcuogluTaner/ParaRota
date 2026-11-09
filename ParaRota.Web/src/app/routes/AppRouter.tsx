import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { MainLayout } from '@app/layouts/MainLayout';
import { AuthLayout } from '@app/layouts/AuthLayout';
import { LoadingScreen } from '@shared/components';
// Kritik ilk yol: login statik kalır (ilk boyamada ikinci bir chunk beklenmesin).
// Doğrudan sayfa dosyasından import: barrel (@features/auth) tüm auth sayfalarını statik
// çektiği için lazy split'i etkisiz kılıyordu.
import { LoginPage } from '@features/auth/pages/LoginPage';
import { PremiumGate } from '@features/subscription/components/PremiumGate';

// Route-level code splitting: sayfalar named export olduğu için `.then(m => ({ default: m.X }))`
// köprüsü gerekiyor. Sayfa dosyasına doğrudan gidiyoruz (barrel değil) ki chunk'lar temiz bölünsün.
const RegisterPage = lazy(() => import('@features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const VerifyEmailPage = lazy(() => import('@features/auth/pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import('@features/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@features/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('@features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const TransactionsPage = lazy(() => import('@features/transactions/pages/TransactionsPage').then((m) => ({ default: m.TransactionsPage })));
const CategoriesPage = lazy(() => import('@features/categories/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const BudgetsPage = lazy(() => import('@features/budgets/pages/BudgetsPage').then((m) => ({ default: m.BudgetsPage })));
const RecurringRulesPage = lazy(() => import('@features/recurring/pages/RecurringRulesPage').then((m) => ({ default: m.RecurringRulesPage })));
const GoalsPage = lazy(() => import('@features/goals/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const DebtsPage = lazy(() => import('@features/debts/pages/DebtsPage').then((m) => ({ default: m.DebtsPage })));
const ProfilePage = lazy(() => import('@features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('@features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('@features/notifications/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const AdminPage = lazy(() => import('@features/admin/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const AcceptInvitePage = lazy(() => import('@features/household/pages/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })));
const HouseholdGate = lazy(() => import('@features/household/components/HouseholdGate').then((m) => ({ default: m.HouseholdGate })));
const ExportsPage = lazy(() => import('@features/exports/pages/ExportsPage').then((m) => ({ default: m.ExportsPage })));
const InvestmentsPage = lazy(() => import('@features/investments/pages/InvestmentsPage').then((m) => ({ default: m.InvestmentsPage })));
const InstallmentsPage = lazy(() => import('@features/installments/pages/InstallmentsPage').then((m) => ({ default: m.InstallmentsPage })));
const PayrollPage = lazy(() => import('@features/payroll/pages/PayrollPage').then((m) => ({ default: m.PayrollPage })));
const SeverancePage = lazy(() => import('@features/payroll/pages/SeverancePage').then((m) => ({ default: m.SeverancePage })));
const RentIncreasePage = lazy(() => import('@features/rent/pages/RentIncreasePage').then((m) => ({ default: m.RentIncreasePage })));
const InflationPage = lazy(() => import('@features/inflation/pages/InflationPage').then((m) => ({ default: m.InflationPage })));
const CalculatorsPage = lazy(() => import('@features/calculators/pages/CalculatorsPage').then((m) => ({ default: m.CalculatorsPage })));
const LoanPage = lazy(() => import('@features/loan/pages/LoanPage').then((m) => ({ default: m.LoanPage })));
const GoldDaysPage = lazy(() => import('@features/goldDays/pages/GoldDaysPage').then((m) => ({ default: m.GoldDaysPage })));
const GoldDayDetailPage = lazy(() => import('@features/goldDays/pages/GoldDayDetailPage').then((m) => ({ default: m.GoldDayDetailPage })));
const PriceAlarmsPage = lazy(() => import('@features/priceAlarms/pages/PriceAlarmsPage').then((m) => ({ default: m.PriceAlarmsPage })));
const SharedPotsPage = lazy(() => import('@features/sharedPots/pages/SharedPotsPage').then((m) => ({ default: m.SharedPotsPage })));
const SharedPotDetailPage = lazy(() => import('@features/sharedPots/pages/SharedPotDetailPage').then((m) => ({ default: m.SharedPotDetailPage })));
const PrivacyPage = lazy(() => import('@features/legal/LegalPage').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('@features/legal/LegalPage').then((m) => ({ default: m.TermsPage })));
const DeleteAccountPage = lazy(() => import('@features/legal/DeleteAccountPage').then((m) => ({ default: m.DeleteAccountPage })));
const SupportPage = lazy(() => import('@features/support/SupportPage').then((m) => ({ default: m.SupportPage })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public legal pages (mağaza için herkese açık URL) */}
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/destek" element={<SupportPage />} />
          <Route path="/delete-account" element={<DeleteAccountPage />} />
          <Route path="/hesap-silme" element={<DeleteAccountPage />} />

          {/* Public auth flow */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Protected app */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/budgets" element={<BudgetsPage />} />
              <Route path="/recurring" element={<RecurringRulesPage />} />
              <Route path="/installments" element={<InstallmentsPage />} />
              <Route path="/calculators" element={<CalculatorsPage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/severance" element={<SeverancePage />} />
              <Route path="/rent-increase" element={<RentIncreasePage />} />
              <Route path="/money-value" element={<InflationPage />} />
              <Route path="/loan-cost" element={<LoanPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/investments" element={<PremiumGate feature="investments"><InvestmentsPage /></PremiumGate>} />
              <Route path="/debts" element={<DebtsPage />} />
              <Route path="/gold-days" element={<GoldDaysPage />} />
              <Route path="/gold-days/:id" element={<GoldDayDetailPage />} />
              <Route path="/price-alarms" element={<PriceAlarmsPage />} />
              <Route path="/shared-pots" element={<SharedPotsPage />} />
              <Route path="/shared-pots/:id" element={<SharedPotDetailPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
              {/* Özel kapı: premium'suz kullanıcı paywall + üyelik listesi görür (aileden ayrılabilsin). */}
              <Route path="/household" element={<HouseholdGate />} />
              <Route path="/accept-invite" element={<PremiumGate feature="household"><AcceptInvitePage /></PremiumGate>} />
              <Route path="/exports" element={<ExportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
