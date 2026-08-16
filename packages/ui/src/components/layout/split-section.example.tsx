// allowed: developer example file (not exported to consumers).
// Hardcoded colors used as visually distinguishable placeholders for layout demonstration.
import { SplitSection, SplitSectionItem } from './split-section'

/**
 * Example 1: Basic split section with diagonal separator (like GreenPulse slide)
 */
export function SplitSectionExample1() {
  return (
    <SplitSection diagonal={true} diagonalAngle={15} padding="lg" bgClass="bg-background">
      {/* Left side - Content */}
      <SplitSectionItem>
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Challenge Context</h2>
          <p className="text-lg text-muted-foreground">
            The world is facing extreme weather due to climate change...
          </p>
        </div>
      </SplitSectionItem>

      {/* Right side - Images with diagonal edge */}
      <SplitSectionItem className="bg-gradient-to-br from-blue-500 to-cyan-400 p-8 shadow-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-square bg-orange-500 rounded-lg" />
          <div className="aspect-square bg-blue-500 rounded-lg" />
          <div className="col-span-2 aspect-video bg-green-500 rounded-lg" />
        </div>
      </SplitSectionItem>
    </SplitSection>
  )
}

/**
 * Example 2: Without diagonal (regular split section)
 */
export function SplitSectionExample2() {
  return (
    <SplitSection diagonal={false} padding="xl" bgClass="bg-muted">
      <SplitSectionItem>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Regular Split</h2>
          <p>No diagonal separator, just two columns</p>
        </div>
      </SplitSectionItem>

      <SplitSectionItem>
        <div className="bg-primary text-primary-foreground p-6 rounded-lg">
          <p>Second column content</p>
        </div>
      </SplitSectionItem>
    </SplitSection>
  )
}

/**
 * Example 3: Three columns with diagonal on last item only
 */
export function SplitSectionExample3() {
  return (
    <SplitSection
      diagonal={true}
      diagonalOn={3}
      diagonalAngle={20}
      layout="horizontal"
      className="grid-cols-1 lg:grid-cols-3"
    >
      <SplitSectionItem>
        <div className="bg-blue-500 text-white p-6">
          <h3>Column 1</h3>
        </div>
      </SplitSectionItem>

      <SplitSectionItem>
        <div className="bg-green-500 text-white p-6">
          <h3>Column 2</h3>
        </div>
      </SplitSectionItem>

      <SplitSectionItem className="bg-purple-500 text-white p-6">
        <h3>Column 3 (with diagonal)</h3>
      </SplitSectionItem>
    </SplitSection>
  )
}

/**
 * Example 4: Different diagonal angles
 */
export function SplitSectionExample4() {
  return (
    <>
      {/* Subtle angle */}
      <SplitSection diagonal={true} diagonalAngle={10} padding="md">
        <div className="p-6">
          <h3>Subtle (10%)</h3>
        </div>
        <div className="bg-blue-500 p-6">Content</div>
      </SplitSection>

      {/* Moderate angle */}
      <SplitSection diagonal={true} diagonalAngle={15} padding="md">
        <div className="p-6">
          <h3>Moderate (15%)</h3>
        </div>
        <div className="bg-green-500 p-6">Content</div>
      </SplitSection>

      {/* Pronounced angle */}
      <SplitSection diagonal={true} diagonalAngle={25} padding="md">
        <div className="p-6">
          <h3>Pronounced (25%)</h3>
        </div>
        <div className="bg-purple-500 p-6">Content</div>
      </SplitSection>
    </>
  )
}

/**
 * Example 5: Right direction diagonal
 */
export function SplitSectionExample5() {
  return (
    <SplitSection diagonal={true} diagonalDirection="right" diagonalAngle={15} padding="lg">
      <SplitSectionItem className="bg-gradient-to-br from-purple-500 to-pink-500 p-8">
        <h2 className="text-white text-2xl">Left side with diagonal</h2>
      </SplitSectionItem>

      <SplitSectionItem>
        <div className="space-y-4 p-6">
          <h2 className="text-2xl font-bold">Right side content</h2>
          <p>Diagonal cut is on the left side now (direction="right")</p>
        </div>
      </SplitSectionItem>
    </SplitSection>
  )
}

/**
 * Example 6: Full example like GreenPulse Challenge Context
 */
export function SplitSectionExample6() {
  return (
    <SplitSection
      diagonal={true}
      diagonalAngle={15}
      diagonalDirection="left"
      padding="xl"
      bgClass="bg-background"
      align="stretch"
    >
      {/* Left: Text content */}
      <SplitSectionItem>
        <div className="space-y-8 py-12">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary rounded-full" />
            <h1 className="text-2xl font-bold text-primary">Logo.AI</h1>
          </div>

          <h2 className="text-3xl font-bold">Challenge context :</h2>

          <div className="bg-card border-l-4 border-amber-500 p-8 space-y-4">
            <h3 className="text-xl font-bold">
              The world is facing extreme weather due to climate change
            </h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
                <span>Limited resources to establish robust ESG frameworks</span>
              </li>
              <li className="flex gap-3">
                <span className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
                <span>Lack of structured documentation</span>
              </li>
              <li className="flex gap-3">
                <span className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
                <span>Gaps in expertise to navigate international standards</span>
              </li>
            </ul>
          </div>
        </div>
      </SplitSectionItem>

      {/* Right: Image grid with gradient background */}
      <SplitSectionItem className="bg-gradient-to-br from-green-500 to-emerald-400 p-12 shadow-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-square bg-orange-500 rounded-lg shadow-lg" />
          <div className="aspect-square bg-blue-500 rounded-lg shadow-lg" />
          <div className="col-span-2 aspect-video bg-cyan-500 rounded-lg shadow-lg" />
          <div className="col-span-2 aspect-video bg-green-600 rounded-lg shadow-lg" />
        </div>
      </SplitSectionItem>
    </SplitSection>
  )
}
