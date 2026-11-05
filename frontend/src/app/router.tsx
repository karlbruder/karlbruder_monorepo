import { Navigate, Route, Routes } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";

import { StaffLayout } from "@/app/routes/tournament/staff-layout";
import { StaffTournamentListRoute, StaffTournamentCreateRoute, StaffTournamentDetailRoute } from "@/app/routes/tournament/staff-tournament-route";
import { PaymentReviewRoute } from "@/app/routes/tournament/payment-review-route";
import { AuthenticatedLayout } from "@/app/routes/authenticated-layout";
import HomeRoute from "@/app/routes/home-route";
import RegistrationRoute from "@/app/routes/tournament/registration-route";
import SignInRoute from "@/app/routes/auth/sign-in-route";
import SignUpRoute from "@/app/routes/auth/sign-up-route";
import PasswordRecoveryRoute from "@/app/routes/auth/password-recovery-route";
import CheckEmailRoute from "@/app/routes/auth/check-email-route";
import ResetPasswordRoute from "@/app/routes/auth/reset-password-route";
import ChangePasswordRoute from "@/app/routes/auth/change-password-route";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/tournaments/registration" element={<RegistrationRoute />} />
      <Route path={accountRoutes.signIn} element={<SignInRoute />} />
      <Route path={accountRoutes.signUp} element={<SignUpRoute />} />
      <Route path={accountRoutes.checkEmail} element={<CheckEmailRoute />} />
      <Route path={accountRoutes.recover} element={<PasswordRecoveryRoute />} />
      <Route path={accountRoutes.newPassword} element={<ResetPasswordRoute />} />
      <Route element={<AuthenticatedLayout />}>
        <Route path={accountRoutes.password} element={<ChangePasswordRoute />} />
        <Route path="/" element={<HomeRoute />} />
        <Route element={<StaffLayout />}>
        <Route path="/staff/tournaments" element={<StaffTournamentListRoute />} />
        <Route path="/staff/tournaments/new" element={<StaffTournamentCreateRoute />} />
        <Route path="/staff/tournaments/:tournamentId" element={<StaffTournamentDetailRoute />} />
        <Route path="/staff/payment-reviews" element={<PaymentReviewRoute />} />
        <Route path="/staff/payment-reviews/:registrationNumber" element={<PaymentReviewRoute />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
