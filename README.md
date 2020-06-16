# Renderer

The renderer (notrenderer) is a tool to visualize 3D maps created with [Tiled](https://www.mapeditor.org/) Map Editor. When you're editing a Tiled map, the renderer will automatically update with each change. The renderer is also responsible for displaying physics simulations.

## Installation

Download or clone the repo and install the renderer package via npm

```bash
cd renderer
npm install
```

## Running

To run the renderer:

```bash
npm run start
```
The renderer will then open in a browser window and will update with each change to the current map.

## Creating a Map File

With the project directory, there is the default `Map.json`. This is a Tiled JSON Map Format and is exported (saved) from Tiled. Currently the editor looks explicitly for a file named `Map.json`, so all new files should maintain that file name when being edited. I will find a better solution for this moving forward to prevent confusion.

## Editing a Map File

### Map Properties
Map properties are the parent settings for the current map.
**Maps are currently locked to 80x80 world units. This property will be editable in the future.**
#### Default Map Properties
- **hole** | `integer` | The # of the hole (out of 9).
- **par** | `integer` | The # of strokes to receive par.
- **title** | `string` | The title of this hole. Will be displayed on the sign object within the map.

### Object Types
Before editing a Map file, it is important the Object types that make up a complete map. These types can be viewed in the right sidebar under 'Objects'. Do not remove an Object category if it happens to be empty.

**The current Object types are:**

- Blocks
- Entities
- Models
- Paths
- Walls

#### Blocks
Block Objects are used to build structures with our map. They are typically simple geometries that allow for things such as ramps / slopes. Since paths and walls can be placed at different positions on the Y axis, blocks can help connect paths at varying levels.
**Note: Blocks take up 2x2 units in the editor.**

##### Block Properties
- **type** | `string` | The type of this block. Default: `cube`
- **direction** | `string: n,s,e,w` | Determines the rotation of this block on the Y axis. Default: `e`
- **y_position** | `float` | Determines the offset of this block in world units on the Y axis. Default: `1.0`
- **color** | `color` | Determines the material color used for this block. Will be ignored if a non-transparent texture is applied.
- **opacity** | `float` | Determines the material opacity used for this block. Default: `1.0`
- **texture** | `string` | Determines the texture mapped to the material used for this block.
***
#### Entities
Entity Objects are used to represent point-specific data within the map.
**Required Entities:** Tee, Hole, Sign

##### Entity Properties
- **y_position** | `float` | Determines the offset of this entity in world units on the Y axis. Default: `1.0`
***
#### Models
Model Objects are used to display custom .obj Model files within the map.

##### Model Properties
- **file** | `string` | Determines the model displayed. Must include the extension (.obj).
- **direction** | `string: n,s,e,w` | Determines the rotation of this model on the Y axis. Default: `e`
- **y_position** | `float` | Determines the offset of this model in world units on the Y axis. Default: `1.0`
- **color** | `color` | Determines the material color used for this model. Will be ignored if a non-transparent texture is applied.
- **opacity** | `float` | Determines the material opacity used for this model. Default: `1.0`
- **texture** | `string` | Determines the texture mapped to the material used for this model.
***
#### Paths
Path Objects determine the playable area of this map. They vary in width & depth but maintain a constant single-unit height.

##### Path Properties
- **y_position** | `float` | Determines the offset of this path in world units on the Y axis. Default: `1.0`
- **color** | `color` | Determines the material color used for this path. Will be ignored if a non-transparent texture is applied.
- **opacity** | `float` | Determines the material opacity used for this path. Default: `1.0`
- **texture** | `string` | Determines the texture mapped to the material used for this path.
***
#### Walls
Wall Objects act as bounds for playable areas. They can be drawn as boxes or polygons, and will extrude two units in height by default.

##### Wall Properties
- **y_position** | `float` | Determines the offset of this wall in world units on the Y axis. Default: `1.0`
- **units_y** | `float` | Determines the height extrusion of this wall in world units on the Y axis. Beveled extrusion is currently disabled. Default: `2.0`
- **color** | `color` | Determines the material color used for this wall. Will be ignored if a non-transparent texture is applied.
- **opacity** | `float` | Determines the material opacity used for this wall. Default: `1.0`
- **texture** | `string` | Determines the texture mapped to the material used for this wall.
***

## Saving / Exporting a Map File
TODO