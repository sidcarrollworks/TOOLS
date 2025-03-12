# DirectionControl Component

A retro-futuristic 2D draggable control for setting direction and magnitude parameters.

## Features

- Intuitive 2D draggable interface for controlling X/Y values
- Distance from center (0,0) determines magnitude/speed
- Angle determines direction
- Visual feedback with color gradient (blue to red) based on intensity
- Hold Shift to lock to 45-degree increments
- Double-click to reset to center (0,0)
- Tooltip with usage hints

## Usage

```tsx
import { DirectionControl } from "../DirectionControl";

<DirectionControl
  valueX={params.normalNoiseShiftX}
  valueY={params.normalNoiseShiftY}
  speed={params.normalNoiseShiftSpeed}
  min={-1}
  max={1}
  minSpeed={0}
  maxSpeed={1}
  step={0.01}
  onChangeX={(value) => handleChange("normalNoiseShiftX", value)}
  onChangeY={(value) => handleChange("normalNoiseShiftY", value)}
  onChangeSpeed={(value) => handleChange("normalNoiseShiftSpeed", value)}
/>;
```

## Props

| Prop          | Type     | Description                      |
| ------------- | -------- | -------------------------------- |
| label         | string   | Optional label for the control   |
| valueX        | number   | Current X value                  |
| valueY        | number   | Current Y value                  |
| speed         | number   | Current speed value              |
| min           | number   | Minimum value for X/Y            |
| max           | number   | Maximum value for X/Y            |
| minSpeed      | number   | Minimum value for speed          |
| maxSpeed      | number   | Maximum value for speed          |
| step          | number   | Step increment for values        |
| onChangeX     | function | Callback for X value changes     |
| onChangeY     | function | Callback for Y value changes     |
| onChangeSpeed | function | Callback for speed value changes |
| disabled      | boolean  | Whether the control is disabled  |

## Future Development

- [ ] Add animation preview in tooltip
- [ ] Implement touch support for mobile devices
- [ ] Add keyboard accessibility
- [ ] Add option to display values as magnitude/angle instead of X/Y
- [ ] Add preset buttons for common directions
- [ ] Improve visual feedback during interaction
- [ ] Add mini-preview showing the effect of current settings

## Notes

This component was designed to replace separate X/Y/Speed sliders with a more intuitive and visual control. It's particularly useful for parameters that represent a direction and magnitude, such as noise shift controls.

The retro-futuristic styling is achieved through gradients, shadows, and subtle visual effects that match the overall aesthetic of the application.
