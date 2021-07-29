import { createContext, derivedContext } from '../../base/context';

const dragging = createContext(false);
const pointing = createContext(false);

export const scrubberContext = {
  dragging,
  pointing,
  interacting: derivedContext(
    [dragging, pointing],
    ([isDragging, isPointing]) => isDragging || isPointing
  )
};
