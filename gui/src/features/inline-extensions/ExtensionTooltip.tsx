import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { lightGray, vscBackground, vscForeground } from "../../components";

const TooltipContainer = styled.div<{ show: boolean; x: number; y: number }>`
  position: fixed;
  top: ${(props) => props.y}px;
  left: ${(props) => props.x}px;
  background-color: ${vscBackground};
  border: 1px solid ${lightGray};
  border-radius: 6px;
  padding: 12px 16px;
  max-width: 350px;
  min-width: 200px;
  z-index: 1000;
  opacity: ${(props) => (props.show ? 1 : 0)};
  visibility: ${(props) => (props.show ? "visible" : "hidden")};
  transition: opacity 0.2s ease-in-out;
  color: ${vscForeground};
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

  /* 添加一个小三角形指向触发元素 */
  &::before {
    content: "";
    position: absolute;
    top: -8px;
    left: 20px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid ${lightGray};
  }

  &::after {
    content: "";
    position: absolute;
    top: -7px;
    left: 20px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid ${vscBackground};
  }
`;

const ExtensionMarker = styled.span`
  color: #007acc;
  cursor: help;
  text-decoration: underline;
  text-decoration-style: dotted;
  font-size: 0.85em;
  display: inline;
  margin-left: 3px;
  margin-right: 1px;
  font-weight: bold;
  background-color: rgba(0, 122, 204, 0.1);
  padding: 1px 3px;
  border-radius: 3px;
  border: 1px solid rgba(0, 122, 204, 0.3);

  &:hover {
    background-color: rgba(0, 122, 204, 0.2);
    border-color: rgba(0, 122, 204, 0.5);
    transform: scale(1.05);
    transition: all 0.1s ease;
  }
`;

interface ExtensionTooltipProps {
  content: string;
  targetWord: string;
  children?: React.ReactNode;
}

export const ExtensionTooltip: React.FC<ExtensionTooltipProps> = ({
  content,
  targetWord,
  children,
}) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const markerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (markerRef.current) {
      const rect = markerRef.current.getBoundingClientRect();
      const tooltipX = rect.left;
      const tooltipY = rect.bottom + 8;

      const maxX = window.innerWidth - 420; // 400px width + 20px margin
      const finalX = Math.min(tooltipX, Math.max(0, maxX));

      setPosition({ x: finalX, y: tooltipY });
      setShow(true);
    }
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  // 点击外部关闭 tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        markerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !markerRef.current.contains(event.target as Node)
      ) {
        setShow(false);
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [show]);

  return (
    <>
      <ExtensionMarker
        ref={markerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={`click for more detailed information"${targetWord}"`}
      >
        {children || "ℹ️"}
      </ExtensionMarker>

      <TooltipContainer
        ref={tooltipRef}
        show={show}
        x={position.x}
        y={position.y}
      >
        <strong>{targetWord}:</strong> {content}
      </TooltipContainer>
    </>
  );
};
