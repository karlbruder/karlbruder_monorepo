import { Navigate, Route, Routes } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";

import { RequireSessionRoute } from "@/app/routes/auth/require-session-route";
import HomeRoute from "@/app/routes/home";
import RegistrationRoute from "@/app/routes/tournament/registration";
import SignInRoute from "@/app/routes/auth/sign-in";
import SignUpRoute from "@/app/routes/auth/sign-up";
import RecoverRoute from "@/app/routes/auth/recover";
import CheckEmailRoute from "@/app/routes/auth/check-email";
import NewPasswordRoute from "@/app/routes/auth/new-password";
import ChangePasswordRoute from "@/app/routes/auth/change-password";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/tournaments/registration" element={<RegistrationRoute />} />
      <Route path={accountRoutes.signIn} element={<SignInRoute />} />
      <Route path={accountRoutes.signUp} element={<SignUpRoute />} />
      <Route path={accountRoutes.checkEmail} element={<CheckEmailRoute />} />
      <Route path={accountRoutes.recover} element={<RecoverRoute />} />
      <Route path={accountRoutes.newPassword} element={<NewPasswordRoute />} />
      <Route element={<RequireSessionRoute />}>
        <Route path={accountRoutes.password} element={<ChangePasswordRoute />} />
        <Route path="/" element={<HomeRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
