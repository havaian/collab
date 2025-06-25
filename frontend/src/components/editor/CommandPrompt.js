import React from "react";
import { classnames } from "../../utils/general";

const CommandPrompt = ({ customInput, setCustomInput }) => {
  return (
    <>
      {" "}
      <textarea
        rows="5"
        value={customInput}
        onChange={(e) => setCustomInput(e.target.value)}
        placeholder={`Write here...`}
        className={classnames(
          "w-full h-56 bg-[#1e293b] rounded-md text-white font-normal text-sm overflow-y-auto px-4 py-2 resize-none"
        )}
      ></textarea>
    </>
  );
};

export default CommandPrompt;
