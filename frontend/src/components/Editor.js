// frontend/src/components/Landing.js
import React, { useState, useEffect } from "react";
import CodeEditorWindow from "./CodeEditorWindow";
import axios from "axios";
import { classnames } from "../utils/general";
import { languageOptions } from "../constants/languageOptions";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { defineTheme } from "../lib/defineTheme";
import useKeyPress from "../hooks/useKeyPress";
import Footer from "./Footer";
import OutputWindow from "./OutputWindow";
import CustomInput from "./CustomInput";
import OutputDetails from "./OutputDetails";
import ThemeDropdown from "./ThemeDropdown";
import LanguagesDropdown from "./LanguagesDropdown";
import Header from "./shared/Header";
import Button from "./shared/Button";
import { RocketLaunchIcon } from '@heroicons/react/24/outline';

const Landing = () => {
  const [code, setCode] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [outputDetails, setOutputDetails] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [theme, setTheme] = useState("night-owl");
  const [language, setLanguage] = useState(languageOptions[0]);

  const enterPress = useKeyPress("Enter");
  const ctrlPress = useKeyPress("Control");

  const onSelectChange = (sl) => {
    console.log("selected Option...", sl);
    setLanguage(sl);
  };

  useEffect(() => {
    if (enterPress && ctrlPress) {
      console.log("enterPress", enterPress);
      console.log("ctrlPress", ctrlPress);
      handleCompile();
    }
  }, [ctrlPress, enterPress]);

  const onChange = (action, data) => {
    switch (action) {
      case "code": {
        setCode(data);
        break;
      }
      default: {
        console.warn("case not handled!", action, data);
      }
    }
  };

  const handleCompile = () => {
    setProcessing(true);
    const formData = {
      language_id: language.id,
      source_code: btoa(code),
      stdin: btoa(customInput),
    };

    const options = {
      method: "POST",
      url: process.env.REACT_APP_RAPID_API_URL,
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "content-type": "application/json",
        "Content-Type": "application/json",
        "X-RapidAPI-Host": process.env.REACT_APP_RAPID_API_HOST,
        "X-RapidAPI-Key": process.env.REACT_APP_RAPID_API_KEY,
      },
      data: formData,
    };

    axios
      .request(options)
      .then(function (response) {
        console.log("res.data", response.data);
        const token = response.data.token;
        checkStatus(token);
      })
      .catch((err) => {
        let error = err.response ? err.response.data : err;
        let status = err.response?.status;
        console.log("status", status);

        if (status === 429) {
          console.log("too many requests", status);
          showErrorToast(`Quota of 100 requests exceeded for the Day!`, 10000);
        }
        setProcessing(false);
        console.log("catch block...", error);
      });
  };

  const checkStatus = async (token) => {
    const options = {
      method: "GET",
      url: process.env.REACT_APP_RAPID_API_URL + "/" + token,
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "X-RapidAPI-Host": process.env.REACT_APP_RAPID_API_HOST,
        "X-RapidAPI-Key": process.env.REACT_APP_RAPID_API_KEY,
      },
    };

    try {
      let response = await axios.request(options);
      let statusId = response.data.status?.id;

      if (statusId === 1 || statusId === 2) {
        setTimeout(() => {
          checkStatus(token);
        }, 2000);
        return;
      } else {
        setProcessing(false);
        setOutputDetails(response.data);
        showSuccessToast(`Compiled Successfully!`);
        console.log("response.data", response.data);
        return;
      }
    } catch (err) {
      console.log("err", err);
      setProcessing(false);
      showErrorToast();
    }
  };

  function handleThemeChange(th) {
    const theme = th;
    console.log("theme...", theme);

    if (["light", "vs-dark"].includes(theme.value)) {
      setTheme(theme);
    } else {
      defineTheme(theme.value).then((_) => setTheme(theme));
    }
  }

  useEffect(() => {
    defineTheme("night-owl").then((_) =>
      setTheme({ value: "night-owl", label: "Night Owl" })
    );
  }, []);

  const showSuccessToast = (msg) => {
    toast.success(msg || `Compiled Successfully!`, {
      position: "top-right",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  const showErrorToast = (msg, timer) => {
    toast.error(msg || `Something went wrong! Please try again.`, {
      position: "top-right",
      autoClose: timer ? timer : 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <Header
        title="Code Editor"
        subtitle="Standalone editor"
        actions={[
          <LanguagesDropdown key="lang" onSelectChange={onSelectChange} />,
          <ThemeDropdown key="theme" handleThemeChange={handleThemeChange} theme={theme} />
        ]}
      />

      {/* Main Content - 85% height */}
      <main className="h-[85vh] overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex flex-row h-full">
              {/* Code Editor Section */}
              <div className="flex-1 flex flex-col">
                <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">Code Editor</h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>Ctrl + Enter to run</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <CodeEditorWindow
                    code={code}
                    onChange={onChange}
                    language={language?.value}
                    theme={theme.value}
                  />
                </div>
              </div>

              {/* Right Panel */}
              <div className="w-80 border-l border-gray-200 flex flex-col bg-gray-50">
                {/* Output Section */}
                <div className="flex-1 flex flex-col">
                  <div className="border-b border-gray-200 px-4 py-3 bg-gray-100">
                    <h3 className="text-sm font-medium text-gray-900">Output</h3>
                  </div>
                  <div className="flex-1 min-h-0">
                    <OutputWindow outputDetails={outputDetails} />
                  </div>
                </div>

                {/* Input & Controls Section */}
                <div className="border-t border-gray-200">
                  <div className="px-4 py-3 bg-gray-100">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Input</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <CustomInput
                      customInput={customInput}
                      setCustomInput={setCustomInput}
                    />
                    <Button
                      onClick={handleCompile}
                      disabled={!code || processing}
                      loading={processing}
                      variant="primary"
                      className="w-full"
                    >
                      {!processing && <RocketLaunchIcon className="h-4 w-4 mr-2" />}
                      {processing ? "Processing..." : "Run Code"}
                    </Button>
                  </div>
                </div>

                {/* Output Details */}
                {outputDetails && (
                  <div className="border-t border-gray-200">
                    <OutputDetails outputDetails={outputDetails} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;