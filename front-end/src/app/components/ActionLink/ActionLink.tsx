import { MouseEventHandler, ReactElement, ReactNode } from "react";
import { Anchor, AnchorProps } from "@mantine/core";


type ActionLinkPropsType = Omit<AnchorProps, "children"> &
  {
    readonly children: ReactNode;
    readonly leftSection?: ReactNode;
    readonly disabled?: boolean;
    readonly onClick: MouseEventHandler<HTMLButtonElement>;
  };

export default function ActionLink({
  children,
  leftSection,
  disabled = false,
  size = "sm",
  c,
  underline,
  style,
  onClick,
  ...anchorProps
}: ActionLinkPropsType): ReactElement
{
  const hasLeftSection = leftSection !== undefined;
  const computedStyle = {
    ...(hasLeftSection === true ? { alignItems: "center", gap: 6 } : {}),
    ...(disabled === true ? { cursor: "default" } : {}),
    ...style
  };

  return (
    <Anchor
      component="button"
      type="button"
      display={hasLeftSection === true ? "inline-flex" : undefined}
      disabled={disabled}
      size={size}
      fw={500}
      w="fit-content"
      c={disabled === true ? "dimmed" : c}
      underline={disabled === true ? "never" : underline}
      opacity={disabled === true ? 0.6 : undefined}
      style={computedStyle}
      onClick={onClick}
      {...anchorProps}
    >
      {hasLeftSection === true ? (
        <>
          {leftSection}
          <span style={{ textDecoration: "inherit" }}>{children}</span>
        </>
      ) : (
        children
      )}
    </Anchor>
  );
}
