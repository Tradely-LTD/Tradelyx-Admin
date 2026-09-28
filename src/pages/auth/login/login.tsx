import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Eye, EyeOff } from "lucide-react";

import { useLoginMutation } from "../auth.api";
import { useUserSlice } from "../authSlice";
import { Btn } from "@/common/ui/kit";

const schema = yup.object().shape({
  email: yup.string().trim().lowercase().email("Enter a valid email address").required("Enter your email"),
  password: yup.string().required("Enter your password"),
});

type Form = yup.InferType<typeof schema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useUserSlice();
  const [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: yupResolver(schema) });
  const [login, { isLoading }] = useLoginMutation();

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: Form) => {
    try {
      // The API reads the password from `passwordHash` (it hashes it itself)
      await login({ email: data.email, passwordHash: data.password, deviceToken: "" } as never).unwrap();
    } catch {
      // the toast from auth.api says why
    }
  };

  const field =
    "h-11 w-full rounded-lg border-0 bg-white px-3.5 text-[15px] text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900";

  return (
    <div className="flex min-h-dvh bg-white">
      <div className="hatch relative hidden w-[44%] flex-col justify-between overflow-hidden bg-brand-950 p-12 text-white lg:flex">
        <span className="self-start text-[24px] font-extrabold tracking-[-0.03em] text-white">Tradely<span className="text-brand-300">X</span></span>
        <div className="relative z-10 max-w-md">
          <p className="eyebrow !text-brand-300">Staff console</p>
          <h1 className="mt-3 text-[40px] font-bold leading-[1.1] tracking-[-0.03em]">
            Every buyer and seller,
            <br />
            <span className="text-brand-300">one desk.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Review verifications, see who is stuck in onboarding and send them the right nudge.
          </p>
        </div>
        <p className="text-xs text-white/35">Tradely LTD · For staff use only</p>
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full border border-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[320px] w-[320px] rounded-full border border-white/[0.08]" />
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm animate-rise" noValidate>
          <img src="/tradelyx_logo.svg" alt="TradelyX" className="mb-10 h-7 w-auto lg:hidden" />
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-ink-soft">Use your TradelyX staff account.</p>

          <label className="mt-8 block text-[13px] font-semibold text-ink" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" className={`${field} mt-1.5`} {...register("email")} aria-invalid={!!errors.email} />
          {errors.email && <p className="mt-1.5 text-[13px] text-danger" role="alert">{errors.email.message}</p>}

          <label className="mt-5 block text-[13px] font-semibold text-ink" htmlFor="password">Password</label>
          <div className="relative mt-1.5">
            <input id="password" type={show ? "text" : "password"} autoComplete="current-password" className={`${field} pr-11`} {...register("password")} aria-invalid={!!errors.password} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center text-ink-faint hover:text-ink">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-[13px] text-danger" role="alert">{errors.password.message}</p>}

          <Btn type="submit" loading={isLoading} className="mt-8 h-11 w-full">
            {isLoading ? "Signing in…" : "Sign in"}
          </Btn>
          <p className="mt-6 text-center text-[13px] text-ink-faint">Forgot your password? Ask an administrator to reset it.</p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
