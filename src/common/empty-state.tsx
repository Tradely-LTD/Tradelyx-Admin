import Icon from "@/assets/file-folder.svg";
import React from "react";
import Text from "./text/text";

interface EmptyStateProps {
  title?: string;
  description?: string;
  button?: React.ReactNode;
}

const EmptyState = ({
  title = "No Item Found",
  description = "Recent stock movements will be displayed here",
  button,
}: EmptyStateProps) => {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-4">
      <Text h3 block className="mb-2">
        {title}
      </Text>
      <Text block color="#717784" className="mb-2 w-[400px] text-center">
        {description}
      </Text>
      <div>
        <img src={Icon} />
      </div>
      {button && button}
    </div>
  );
};

export default EmptyState;
