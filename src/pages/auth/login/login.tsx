import { useState, ChangeEvent, useEffect } from "react";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import Input from "../../../common/input/input";
import Button from "../../../common/button/button";
import { Link, useNavigate } from "react-router-dom";
import { useLoginMutation } from "../auth.api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

const schema = yup.object().shape({
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters long")
    .required("Password is required"),
  email: yup.string().email("Invalid email address").required("Email is required"),
});
const LoginPage = () => {
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const [handleLogin, { isLoading, isSuccess }] = useLoginMutation();

  const onSubmit = async (data: any) => {
    await handleLogin({ email: data.email, passwordHash: data.password, deviceToken: "" }).unwrap();
  };

  useEffect(() => {
    if (isSuccess) {
      navigate("/");
    }
  }, [isSuccess]);

  return (
    <Container>
      <div className="w-full  flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
            <p className="text-gray-500">Please log in to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <div>
                <Input
                  label="Email"
                  type="text"
                  placeholder="Email Address"
                  {...register("email")}
                  error={errors.email?.message}
                  onChange={(e) => {
                    const emailValue = e.target.value.toLowerCase();
                    setValue("email", emailValue);
                    clearErrors("email");
                  }}
                />
              </div>
              <div className="my-3">
                <Input
                  label="Password"
                  type="password"
                  placeholder="Password"
                  {...register("password", { required: "Password is required" })}
                  error={errors.password?.message}
                  onChange={(e) => {
                    setValue("password", e.target.value);
                    clearErrors("password");
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-500">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm text-[#143085] hover:text-blue-700">
                Forgot Password
              </a>
            </div>

            <Button loading={isLoading} fullWidth type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <p className="text-center mt-8 text-gray-500">
            Don't have an account yet?{" "}
            <Link to="/register" className="text-[#143085] hover:text-blue-700">
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default LoginPage;

const Info = styled.div`
  background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
    url("https://s3-alpha-sig.figma.com/img/f36e/eda3/82a9acebc97b1c621256eb13648950a6?Expires=1738540800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=aONR4dLiJlocr0d43KrMabRw7LSR2wxBv8YSWw1Q3LwatxDsATB7BJXDPXoO~aiqLv0vbSVTq5ApxT6O1aa8THkueMBJJkOoCWJNL3u31MNTWNCymxSkXXBvB~8HcnkGdQ1DncaYI6JlIe6ybmUNX~CHxImaaF9OclW0EF-BQCal10CD5BhkcoSkV0AMzP1n2sp98ckUf8TgyMN8nyAHiEg8f2bhZ1EGnyWPr2z9XmXhFicWE8Zp1GMucQbJFs~svZOyWGZXkD9jOfZyJ49feDmnJnU7pKbazAWTXNynELcynZ-9ACVtqq5tjFwB~ihiqiwmDYY0heWzRll64T3llg__");
  background-position: center;
  background-repeat: no-repeat;
  width: 70%;
  @media screen and (max-width: 770px) {
    display: none;
  }
`;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  /* flex-wrap: wrap; */
`;
