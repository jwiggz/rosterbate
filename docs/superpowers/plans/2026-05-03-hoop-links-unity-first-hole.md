# Hoop Links Unity First Hole Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one polished playable Unity Hoop Links hole: a mini-golf-style basketball wall-bank puzzle with aim, power, ball physics, rim scoring, reset, and minimal HUD.

**Architecture:** Create focused runtime scripts under `HoopLinksUnity/Assets/Scripts/HoopLinks` and a deterministic editor scene builder under `HoopLinksUnity/Assets/Editor/HoopLinks`. The scene builder constructs the lane, rail bank, open-center hoop, ball, camera, materials, and script references so the prototype can be rebuilt consistently while tuning.

**Tech Stack:** Unity 6.4.5f1, C#, Unity Physics, Unity UI, Unity Test Framework, MCP Unity for editor inspection and scene verification. User requested local-only work, so this plan uses verification checkpoints instead of git commits.

---

## File Structure

- Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\HoleDefinition.cs`
  - Serializable scene data for one playable hole.
- Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\ShotController.cs`
  - Aim, power input, launch calculation, and shot lockout.
- Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\BallController.cs`
  - Ball reset, live-shot state, stop detection, and out-of-bounds detection.
- Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\HoopGoal.cs`
  - Downward rim-entry scoring trigger.
- Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\CourseManager.cs`
  - Stroke count, shot lifecycle, reset, scoring, and HUD coordination.
- Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\PrototypeHUD.cs`
  - Minimal UI labels and power bar.
- Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Editor\HoopLinks\HoopLinksFirstHoleBuilder.cs`
  - Editor menu/batch method that creates the first hole scene and saves it.
- Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Tests\EditMode\HoopLinksRuntimeTests.cs`
  - EditMode tests for launch calculation, stop detection, and rim-entry scoring.
- Create generated scene `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scenes\HoopLinks_FirstHole.unity`
  - Built by the editor builder, not manually edited line by line.

---

### Task 1: Add Runtime API Tests

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Tests\EditMode\HoopLinksRuntimeTests.cs`
- Create later in this plan: runtime scripts referenced by these tests.

- [ ] **Step 1: Create the test folder**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Tests\EditMode'
```

Expected: folder exists.

- [ ] **Step 2: Write failing EditMode tests**

Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Tests\EditMode\HoopLinksRuntimeTests.cs`:

```csharp
using HoopLinks;
using NUnit.Framework;
using UnityEngine;

public class HoopLinksRuntimeTests
{
    [Test]
    public void LaunchVelocityClampsPowerAndAddsArc()
    {
        Vector3 velocity = ShotController.CalculateLaunchVelocity(
            Vector3.forward,
            2f,
            8f,
            22f,
            6f
        );

        Assert.That(velocity.z, Is.EqualTo(22f).Within(0.001f));
        Assert.That(velocity.y, Is.EqualTo(6f).Within(0.001f));
    }

    [Test]
    public void BallStopDetectionRequiresLowLinearAndAngularSpeedForEnoughTime()
    {
        Assert.IsFalse(BallController.HasSettled(0.08f, 0.08f, 0.4f, 0.1f, 0.1f, 0.75f));
        Assert.IsFalse(BallController.HasSettled(0.2f, 0.08f, 1f, 0.1f, 0.1f, 0.75f));
        Assert.IsTrue(BallController.HasSettled(0.08f, 0.08f, 0.8f, 0.1f, 0.1f, 0.75f));
    }

    [Test]
    public void HoopGoalOnlyAcceptsDownwardEntry()
    {
        Assert.IsTrue(HoopGoal.IsValidEntryVelocity(new Vector3(0f, -1.2f, 0.1f), -0.35f));
        Assert.IsFalse(HoopGoal.IsValidEntryVelocity(new Vector3(0f, 0.1f, 0.1f), -0.35f));
    }
}
```

- [ ] **Step 3: Run tests to verify they fail for missing classes**

Run:

```powershell
& 'C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe' -batchmode -projectPath 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity' -runTests -testPlatform EditMode -testResults 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\editmode-results.xml' -logFile 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\editmode-task1.log'
```

Expected: fails because `ShotController`, `BallController`, and `HoopGoal` do not exist.

---

### Task 2: Add Core Runtime Scripts

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\HoleDefinition.cs`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\ShotController.cs`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\BallController.cs`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\HoopGoal.cs`

- [ ] **Step 1: Create the runtime folder**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks'
```

Expected: folder exists.

- [ ] **Step 2: Add `HoleDefinition.cs`**

Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\HoleDefinition.cs`:

```csharp
using UnityEngine;

namespace HoopLinks
{
    public class HoleDefinition : MonoBehaviour
    {
        public string holeName = "Hole 1 - Wall Bank";
        public int par = 2;
        public Transform tee;
        public Transform hoop;
        public Bounds resetBounds = new Bounds(new Vector3(0f, 1f, 10f), new Vector3(22f, 10f, 34f));
        public Vector3 recommendedAim = new Vector3(-0.38f, 0f, 1f);
        public float cameraHeight = 7f;
        public float cameraDistance = 11f;
    }
}
```

- [ ] **Step 3: Add `ShotController.cs`**

Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\ShotController.cs`:

```csharp
using UnityEngine;

namespace HoopLinks
{
    public class ShotController : MonoBehaviour
    {
        [SerializeField] private BallController ball;
        [SerializeField] private Transform aimPivot;
        [SerializeField] private LineRenderer aimLine;
        [SerializeField] private PrototypeHUD hud;
        [SerializeField] private float aimDegreesPerSecond = 75f;
        [SerializeField] private float minImpulse = 8f;
        [SerializeField] private float maxImpulse = 22f;
        [SerializeField] private float arcLift = 6f;
        [SerializeField] private float chargeSeconds = 1.25f;

        private float power;
        private float chargeStartTime;
        private bool charging;
        private bool inputLocked;

        public float Power => power;
        public bool InputLocked => inputLocked;

        private void Update()
        {
            if (inputLocked || ball == null || ball.IsLive)
            {
                return;
            }

            float aimInput = Input.GetAxisRaw("Horizontal");
            if (Mathf.Abs(aimInput) > 0.01f && aimPivot != null)
            {
                aimPivot.Rotate(Vector3.up, aimInput * aimDegreesPerSecond * Time.deltaTime, Space.World);
            }

            if (Input.GetKeyDown(KeyCode.Space))
            {
                charging = true;
                chargeStartTime = Time.time;
                power = 0f;
            }

            if (charging && Input.GetKey(KeyCode.Space))
            {
                power = Mathf.PingPong((Time.time - chargeStartTime) / chargeSeconds, 1f);
                hud?.SetPower(power);
            }

            if (charging && Input.GetKeyUp(KeyCode.Space))
            {
                charging = false;
                Launch();
            }

            UpdateAimGuide();
        }

        public void Configure(BallController configuredBall, Transform configuredAimPivot, LineRenderer configuredAimLine, PrototypeHUD configuredHud)
        {
            ball = configuredBall;
            aimPivot = configuredAimPivot;
            aimLine = configuredAimLine;
            hud = configuredHud;
            UpdateAimGuide();
        }

        public void SetInputLocked(bool locked)
        {
            inputLocked = locked;
            charging = false;
            if (locked)
            {
                power = 0f;
                hud?.SetPower(0f);
            }
        }

        public void Launch()
        {
            if (ball == null || aimPivot == null)
            {
                return;
            }

            Vector3 velocity = CalculateLaunchVelocity(aimPivot.forward, power, minImpulse, maxImpulse, arcLift);
            ball.Launch(velocity);
            SetInputLocked(true);
        }

        private void UpdateAimGuide()
        {
            if (aimLine == null || aimPivot == null || ball == null)
            {
                return;
            }

            Vector3 origin = ball.transform.position + Vector3.up * 0.18f;
            Vector3 target = origin + aimPivot.forward.normalized * 4.5f;
            aimLine.positionCount = 2;
            aimLine.SetPosition(0, origin);
            aimLine.SetPosition(1, target);
        }

        public static Vector3 CalculateLaunchVelocity(Vector3 aimDirection, float power, float minImpulse, float maxImpulse, float arcLift)
        {
            Vector3 flatDirection = Vector3.ProjectOnPlane(aimDirection, Vector3.up).normalized;
            if (flatDirection.sqrMagnitude < 0.001f)
            {
                flatDirection = Vector3.forward;
            }

            float clampedPower = Mathf.Clamp01(power);
            float impulse = Mathf.Lerp(minImpulse, maxImpulse, clampedPower);
            return flatDirection * impulse + Vector3.up * arcLift;
        }
    }
}
```

- [ ] **Step 4: Add `BallController.cs`**

Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\BallController.cs`:

```csharp
using UnityEngine;

namespace HoopLinks
{
    [RequireComponent(typeof(Rigidbody))]
    public class BallController : MonoBehaviour
    {
        [SerializeField] private Rigidbody body;
        [SerializeField] private float settledSpeed = 0.12f;
        [SerializeField] private float settledAngularSpeed = 0.12f;
        [SerializeField] private float settledSecondsRequired = 0.85f;
        [SerializeField] private float maxLiveSeconds = 9f;

        private Vector3 teePosition;
        private Quaternion teeRotation;
        private Bounds resetBounds;
        private float liveSeconds;
        private float settledSeconds;

        public bool IsLive { get; private set; }
        public bool IsSettled => HasSettled(body.linearVelocity.magnitude, body.angularVelocity.magnitude, settledSeconds, settledSpeed, settledAngularSpeed, settledSecondsRequired);
        public bool IsOutOfBounds => !resetBounds.Contains(transform.position);
        public Rigidbody Body => body;

        private void Awake()
        {
            if (body == null)
            {
                body = GetComponent<Rigidbody>();
            }
        }

        private void FixedUpdate()
        {
            if (!IsLive)
            {
                return;
            }

            liveSeconds += Time.fixedDeltaTime;
            if (body.linearVelocity.magnitude <= settledSpeed && body.angularVelocity.magnitude <= settledAngularSpeed)
            {
                settledSeconds += Time.fixedDeltaTime;
            }
            else
            {
                settledSeconds = 0f;
            }
        }

        public void Configure(Vector3 configuredTeePosition, Quaternion configuredTeeRotation, Bounds configuredResetBounds)
        {
            teePosition = configuredTeePosition;
            teeRotation = configuredTeeRotation;
            resetBounds = configuredResetBounds;
            ResetToTee();
        }

        public void Launch(Vector3 velocity)
        {
            IsLive = true;
            liveSeconds = 0f;
            settledSeconds = 0f;
            body.isKinematic = false;
            body.linearVelocity = velocity;
            body.angularVelocity = Vector3.Cross(Vector3.up, velocity.normalized) * 12f;
        }

        public bool ShouldResolveShot()
        {
            return IsLive && (IsSettled || IsOutOfBounds || liveSeconds >= maxLiveSeconds);
        }

        public void ResetToTee()
        {
            transform.SetPositionAndRotation(teePosition, teeRotation);
            body.linearVelocity = Vector3.zero;
            body.angularVelocity = Vector3.zero;
            body.isKinematic = false;
            IsLive = false;
            liveSeconds = 0f;
            settledSeconds = 0f;
        }

        public void MarkScored()
        {
            IsLive = false;
            body.linearVelocity *= 0.25f;
            body.angularVelocity *= 0.25f;
        }

        public static bool HasSettled(float linearSpeed, float angularSpeed, float quietSeconds, float linearThreshold, float angularThreshold, float requiredQuietSeconds)
        {
            return linearSpeed <= linearThreshold && angularSpeed <= angularThreshold && quietSeconds >= requiredQuietSeconds;
        }
    }
}
```

- [ ] **Step 5: Add `HoopGoal.cs`**

Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\HoopGoal.cs`:

```csharp
using UnityEngine;

namespace HoopLinks
{
    public class HoopGoal : MonoBehaviour
    {
        [SerializeField] private CourseManager courseManager;
        [SerializeField] private float downwardVelocityThreshold = -0.35f;

        public void Configure(CourseManager manager)
        {
            courseManager = manager;
        }

        private void OnTriggerEnter(Collider other)
        {
            BallController ball = other.GetComponentInParent<BallController>();
            if (ball == null || ball.Body == null)
            {
                return;
            }

            if (IsValidEntryVelocity(ball.Body.linearVelocity, downwardVelocityThreshold))
            {
                courseManager?.RecordMadeBasket(ball);
            }
        }

        public static bool IsValidEntryVelocity(Vector3 velocity, float downwardThreshold)
        {
            return velocity.y <= downwardThreshold;
        }
    }
}
```

- [ ] **Step 6: Run EditMode tests**

Run:

```powershell
& 'C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe' -batchmode -projectPath 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity' -runTests -testPlatform EditMode -testResults 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\editmode-results.xml' -logFile 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\editmode-task2.log'
```

Expected: tests pass.

---

### Task 3: Add Course Loop And HUD

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\CourseManager.cs`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\PrototypeHUD.cs`

- [ ] **Step 1: Add `CourseManager.cs`**

Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\CourseManager.cs`:

```csharp
using UnityEngine;

namespace HoopLinks
{
    public class CourseManager : MonoBehaviour
    {
        [SerializeField] private HoleDefinition hole;
        [SerializeField] private BallController ball;
        [SerializeField] private ShotController shotController;
        [SerializeField] private PrototypeHUD hud;

        private bool holeComplete;

        public int Strokes { get; private set; }
        public bool HoleComplete => holeComplete;

        private void Start()
        {
            ConfigureScene();
        }

        private void Update()
        {
            if (ball == null || holeComplete)
            {
                return;
            }

            if (ball.ShouldResolveShot())
            {
                ResolveMiss();
            }
        }

        public void Configure(HoleDefinition configuredHole, BallController configuredBall, ShotController configuredShotController, PrototypeHUD configuredHud)
        {
            hole = configuredHole;
            ball = configuredBall;
            shotController = configuredShotController;
            hud = configuredHud;
        }

        public void ConfigureScene()
        {
            if (hole == null || ball == null)
            {
                return;
            }

            ball.Configure(hole.tee.position, hole.tee.rotation, hole.resetBounds);
            Strokes = 0;
            holeComplete = false;
            shotController?.SetInputLocked(false);
            hud?.SetHole(hole.holeName, hole.par);
            hud?.SetStrokes(Strokes);
            hud?.SetMessage("Bank it off the wall.");
            hud?.SetPower(0f);
        }

        public void NotifyShotLaunched()
        {
            Strokes += 1;
            hud?.SetStrokes(Strokes);
            hud?.SetMessage("Shot away.");
        }

        public void RecordMadeBasket(BallController scoredBall)
        {
            if (holeComplete)
            {
                return;
            }

            holeComplete = true;
            scoredBall.MarkScored();
            shotController?.SetInputLocked(true);
            hud?.SetMessage($"Made it in {Strokes} stroke{(Strokes == 1 ? string.Empty : "s")}.");
        }

        public void ResolveMiss()
        {
            ball.ResetToTee();
            shotController?.SetInputLocked(false);
            hud?.SetMessage("Try again.");
            hud?.SetPower(0f);
        }
    }
}
```

- [ ] **Step 2: Update `ShotController.Launch` to notify strokes**

Modify `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\ShotController.cs`:

```csharp
[SerializeField] private CourseManager courseManager;
```

Add to `Configure(...)` signature and assignment:

```csharp
public void Configure(BallController configuredBall, Transform configuredAimPivot, LineRenderer configuredAimLine, PrototypeHUD configuredHud, CourseManager configuredCourseManager)
{
    ball = configuredBall;
    aimPivot = configuredAimPivot;
    aimLine = configuredAimLine;
    hud = configuredHud;
    courseManager = configuredCourseManager;
    UpdateAimGuide();
}
```

In `Launch()`, immediately after `ball.Launch(velocity);`, add:

```csharp
courseManager?.NotifyShotLaunched();
```

- [ ] **Step 3: Add `PrototypeHUD.cs`**

Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\PrototypeHUD.cs`:

```csharp
using UnityEngine;
using UnityEngine.UI;

namespace HoopLinks
{
    public class PrototypeHUD : MonoBehaviour
    {
        [SerializeField] private Text holeLabel;
        [SerializeField] private Text strokeLabel;
        [SerializeField] private Text messageLabel;
        [SerializeField] private Image powerFill;

        public void Configure(Text configuredHoleLabel, Text configuredStrokeLabel, Text configuredMessageLabel, Image configuredPowerFill)
        {
            holeLabel = configuredHoleLabel;
            strokeLabel = configuredStrokeLabel;
            messageLabel = configuredMessageLabel;
            powerFill = configuredPowerFill;
        }

        public void SetHole(string holeName, int par)
        {
            if (holeLabel != null)
            {
                holeLabel.text = $"{holeName}  |  Par {par}";
            }
        }

        public void SetStrokes(int strokes)
        {
            if (strokeLabel != null)
            {
                strokeLabel.text = $"Strokes: {strokes}";
            }
        }

        public void SetMessage(string message)
        {
            if (messageLabel != null)
            {
                messageLabel.text = message;
            }
        }

        public void SetPower(float power)
        {
            if (powerFill != null)
            {
                powerFill.fillAmount = Mathf.Clamp01(power);
            }
        }
    }
}
```

- [ ] **Step 4: Run EditMode tests again**

Run:

```powershell
& 'C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe' -batchmode -projectPath 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity' -runTests -testPlatform EditMode -testResults 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\editmode-results.xml' -logFile 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\editmode-task3.log'
```

Expected: tests pass and Unity compiles the new runtime scripts.

---

### Task 4: Add Repeatable Scene Builder

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Editor\HoopLinks\HoopLinksFirstHoleBuilder.cs`
- Generated: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scenes\HoopLinks_FirstHole.unity`

- [ ] **Step 1: Create editor and scene folders**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Editor\HoopLinks'
New-Item -ItemType Directory -Force -Path 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scenes'
```

Expected: both folders exist.

- [ ] **Step 2: Add the builder script**

Create `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Editor\HoopLinks\HoopLinksFirstHoleBuilder.cs`:

```csharp
using HoopLinks;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

namespace HoopLinks.Editor
{
    public static class HoopLinksFirstHoleBuilder
    {
        private const string ScenePath = "Assets/Scenes/HoopLinks_FirstHole.unity";

        [MenuItem("Hoop Links/Build First Hole")]
        public static void BuildFirstHole()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            Material turf = CreateMaterial("HL_Turf", new Color(0.36f, 0.78f, 0.59f));
            Material rail = CreateMaterial("HL_Rail", new Color(0.95f, 0.78f, 0.34f));
            Material dark = CreateMaterial("HL_DarkRailBase", new Color(0.04f, 0.06f, 0.07f));
            Material orange = CreateMaterial("HL_BasketballOrange", new Color(0.95f, 0.45f, 0.16f));
            Material rim = CreateMaterial("HL_RimOrange", new Color(0.95f, 0.42f, 0.12f));
            Material glass = CreateMaterial("HL_BackboardGlass", new Color(0.65f, 0.95f, 0.95f, 0.45f));
            Material white = CreateMaterial("HL_White", Color.white);
            Material black = CreateMaterial("HL_Black", Color.black);

            GameObject root = new GameObject("HoopLinks_FirstHole");
            GameObject course = new GameObject("Course");
            course.transform.SetParent(root.transform);

            CreateCube("Turf Lane", course.transform, new Vector3(0f, 0f, 11f), new Vector3(12f, 0.35f, 26f), turf);
            CreateCube("Left Rail", course.transform, new Vector3(-6.2f, 0.7f, 11f), new Vector3(0.35f, 1.1f, 26f), rail);
            CreateCube("Right Rail", course.transform, new Vector3(6.2f, 0.7f, 11f), new Vector3(0.35f, 1.1f, 26f), rail);
            CreateCube("Back Stop Rail", course.transform, new Vector3(0f, 0.7f, 24.2f), new Vector3(12.4f, 1.1f, 0.35f), rail);
            CreateCube("Bank Wall", course.transform, new Vector3(4.6f, 1.2f, 10.4f), new Vector3(0.45f, 2.2f, 7.5f), rail).transform.rotation = Quaternion.Euler(0f, -24f, 0f);
            CreateCube("Dark Gutter Left", course.transform, new Vector3(-6.55f, 0.08f, 11f), new Vector3(0.25f, 0.2f, 26f), dark);
            CreateCube("Dark Gutter Right", course.transform, new Vector3(6.55f, 0.08f, 11f), new Vector3(0.25f, 0.2f, 26f), dark);

            GameObject tee = new GameObject("Tee");
            tee.transform.SetParent(root.transform);
            tee.transform.SetPositionAndRotation(new Vector3(0f, 0.55f, -1.2f), Quaternion.identity);
            CreateCylinder("Tee Pad", tee.transform, Vector3.zero, new Vector3(1.8f, 0.08f, 1.8f), new Color(0.4f, 0.85f, 0.9f));

            GameObject hoopRoot = new GameObject("Hoop");
            hoopRoot.transform.SetParent(root.transform);
            hoopRoot.transform.position = new Vector3(0f, 0f, 21.4f);
            CreateCylinder("Pole", hoopRoot.transform, new Vector3(0f, 2.25f, 0.85f), new Vector3(0.12f, 4.5f, 0.12f), black);
            CreateCube("Backboard", hoopRoot.transform, new Vector3(0f, 4.15f, 0f), new Vector3(4.4f, 2.6f, 0.18f), glass);
            CreateCube("Target Square", hoopRoot.transform, new Vector3(0f, 4.05f, -0.12f), new Vector3(1.25f, 0.72f, 0.08f), white);
            CreateOpenRim(hoopRoot.transform, new Vector3(0f, 3.55f, -1.0f), rim);
            GameObject scoreTrigger = CreateCube("Score Trigger", hoopRoot.transform, new Vector3(0f, 3.28f, -1.0f), new Vector3(1.05f, 0.22f, 1.05f), white);
            scoreTrigger.GetComponent<MeshRenderer>().enabled = false;
            BoxCollider trigger = scoreTrigger.GetComponent<BoxCollider>();
            trigger.isTrigger = true;

            GameObject ball = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            ball.name = "Basketball";
            ball.transform.SetParent(root.transform);
            ball.transform.position = tee.transform.position + Vector3.up * 0.42f;
            ball.transform.localScale = Vector3.one * 0.74f;
            ball.GetComponent<MeshRenderer>().sharedMaterial = orange;
            Rigidbody ballBody = ball.AddComponent<Rigidbody>();
            ballBody.mass = 0.62f;
            ballBody.linearDamping = 0.38f;
            ballBody.angularDamping = 0.42f;
            PhysicMaterial ballPhysics = new PhysicMaterial("HL_Ball_Physics")
            {
                bounciness = 0.72f,
                dynamicFriction = 0.42f,
                staticFriction = 0.5f,
                bounceCombine = PhysicMaterialCombine.Maximum,
                frictionCombine = PhysicMaterialCombine.Average
            };
            ball.GetComponent<SphereCollider>().sharedMaterial = ballPhysics;
            BallController ballController = ball.AddComponent<BallController>();

            GameObject aimPivot = new GameObject("Aim Pivot");
            aimPivot.transform.SetParent(root.transform);
            aimPivot.transform.position = ball.transform.position;
            aimPivot.transform.rotation = Quaternion.Euler(0f, -18f, 0f);
            LineRenderer aimLine = aimPivot.AddComponent<LineRenderer>();
            aimLine.material = CreateMaterial("HL_AimLine", new Color(0.1f, 0.85f, 1f));
            aimLine.startWidth = 0.08f;
            aimLine.endWidth = 0.02f;
            aimLine.positionCount = 2;

            GameObject systems = new GameObject("Systems");
            systems.transform.SetParent(root.transform);
            HoleDefinition hole = systems.AddComponent<HoleDefinition>();
            CourseManager courseManager = systems.AddComponent<CourseManager>();
            ShotController shotController = systems.AddComponent<ShotController>();
            HoopGoal hoopGoal = scoreTrigger.AddComponent<HoopGoal>();
            PrototypeHUD hud = BuildHud(systems.transform);

            hole.holeName = "Hole 1 - Wall Bank";
            hole.par = 2;
            hole.tee = tee.transform;
            hole.hoop = hoopRoot.transform;
            hole.resetBounds = new Bounds(new Vector3(0f, 2.2f, 11f), new Vector3(16f, 9f, 31f));

            courseManager.Configure(hole, ballController, shotController, hud);
            shotController.Configure(ballController, aimPivot.transform, aimLine, hud, courseManager);
            hoopGoal.Configure(courseManager);

            BuildLighting();
            BuildCamera(ball.transform, hoopRoot.transform);

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorSceneManager.OpenScene(ScenePath);
            Debug.Log($"Hoop Links first hole built at {ScenePath}");
        }

        public static void BuildFirstHoleFromBatch()
        {
            BuildFirstHole();
        }

        private static Material CreateMaterial(string name, Color color)
        {
            string folder = "Assets/Materials";
            if (!AssetDatabase.IsValidFolder(folder))
            {
                AssetDatabase.CreateFolder("Assets", "Materials");
            }

            string path = $"{folder}/{name}.mat";
            Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(Shader.Find("Standard"));
                AssetDatabase.CreateAsset(material, path);
            }

            material.color = color;
            EditorUtility.SetDirty(material);
            return material;
        }

        private static GameObject CreateCube(string name, Transform parent, Vector3 position, Vector3 scale, Material material)
        {
            GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cube.name = name;
            cube.transform.SetParent(parent);
            cube.transform.localPosition = position;
            cube.transform.localScale = scale;
            cube.GetComponent<MeshRenderer>().sharedMaterial = material;
            return cube;
        }

        private static GameObject CreateCylinder(string name, Transform parent, Vector3 position, Vector3 scale, Material material)
        {
            GameObject cylinder = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            cylinder.name = name;
            cylinder.transform.SetParent(parent);
            cylinder.transform.localPosition = position;
            cylinder.transform.localScale = scale;
            cylinder.GetComponent<MeshRenderer>().sharedMaterial = material;
            return cylinder;
        }

        private static GameObject CreateCylinder(string name, Transform parent, Vector3 position, Vector3 scale, Color color)
        {
            return CreateCylinder(name, parent, position, scale, CreateMaterial($"HL_{name.Replace(" ", "_")}", color));
        }

        private static void CreateOpenRim(Transform parent, Vector3 center, Material rimMaterial)
        {
            const int segments = 18;
            const float radius = 0.64f;
            for (int i = 0; i < segments; i++)
            {
                float angle = i * Mathf.PI * 2f / segments;
                float nextAngle = (i + 1) * Mathf.PI * 2f / segments;
                Vector3 a = center + new Vector3(Mathf.Cos(angle) * radius, 0f, Mathf.Sin(angle) * radius);
                Vector3 b = center + new Vector3(Mathf.Cos(nextAngle) * radius, 0f, Mathf.Sin(nextAngle) * radius);
                Vector3 mid = (a + b) * 0.5f;
                GameObject segment = GameObject.CreatePrimitive(PrimitiveType.Cube);
                segment.name = $"Rim Segment {i + 1:00}";
                segment.transform.SetParent(parent);
                segment.transform.localPosition = mid;
                segment.transform.localScale = new Vector3(0.12f, 0.12f, Vector3.Distance(a, b));
                segment.transform.localRotation = Quaternion.LookRotation((b - a).normalized, Vector3.up);
                segment.GetComponent<MeshRenderer>().sharedMaterial = rimMaterial;
                BoxCollider collider = segment.GetComponent<BoxCollider>();
                collider.material = new PhysicMaterial("HL_Rim_Physics")
                {
                    bounciness = 0.55f,
                    dynamicFriction = 0.28f,
                    staticFriction = 0.35f,
                    bounceCombine = PhysicMaterialCombine.Maximum
                };
            }
        }

        private static PrototypeHUD BuildHud(Transform parent)
        {
            GameObject canvasObject = new GameObject("Prototype HUD");
            canvasObject.transform.SetParent(parent);
            Canvas canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasObject.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasObject.AddComponent<GraphicRaycaster>();

            Text hole = CreateText(canvasObject.transform, "Hole Label", new Vector2(24f, -24f), 24, TextAnchor.UpperLeft);
            Text strokes = CreateText(canvasObject.transform, "Stroke Label", new Vector2(24f, -58f), 22, TextAnchor.UpperLeft);
            Text message = CreateText(canvasObject.transform, "Message Label", new Vector2(24f, -92f), 20, TextAnchor.UpperLeft);

            GameObject powerBack = new GameObject("Power Back");
            powerBack.transform.SetParent(canvasObject.transform);
            Image powerBackImage = powerBack.AddComponent<Image>();
            powerBackImage.color = new Color(0f, 0f, 0f, 0.6f);
            RectTransform backRect = powerBack.GetComponent<RectTransform>();
            backRect.anchorMin = new Vector2(0.5f, 0f);
            backRect.anchorMax = new Vector2(0.5f, 0f);
            backRect.sizeDelta = new Vector2(420f, 28f);
            backRect.anchoredPosition = new Vector2(0f, 36f);

            GameObject powerFillObject = new GameObject("Power Fill");
            powerFillObject.transform.SetParent(powerBack.transform);
            Image powerFill = powerFillObject.AddComponent<Image>();
            powerFill.color = new Color(1f, 0.58f, 0.15f, 0.95f);
            powerFill.type = Image.Type.Filled;
            powerFill.fillMethod = Image.FillMethod.Horizontal;
            RectTransform fillRect = powerFillObject.GetComponent<RectTransform>();
            fillRect.anchorMin = Vector2.zero;
            fillRect.anchorMax = Vector2.one;
            fillRect.offsetMin = new Vector2(4f, 4f);
            fillRect.offsetMax = new Vector2(-4f, -4f);

            PrototypeHUD hud = canvasObject.AddComponent<PrototypeHUD>();
            hud.Configure(hole, strokes, message, powerFill);
            return hud;
        }

        private static Text CreateText(Transform parent, string name, Vector2 position, int size, TextAnchor anchor)
        {
            GameObject textObject = new GameObject(name);
            textObject.transform.SetParent(parent);
            Text text = textObject.AddComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = size;
            text.color = Color.white;
            text.alignment = anchor;
            RectTransform rect = textObject.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.sizeDelta = new Vector2(620f, 32f);
            rect.anchoredPosition = position;
            return text;
        }

        private static void BuildLighting()
        {
            GameObject lightObject = new GameObject("Directional Light");
            Light light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.2f;
            lightObject.transform.rotation = Quaternion.Euler(50f, -35f, 0f);
            RenderSettings.ambientLight = new Color(0.46f, 0.5f, 0.55f);
        }

        private static void BuildCamera(Transform ball, Transform hoop)
        {
            GameObject cameraObject = new GameObject("Main Camera");
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.transform.position = new Vector3(0f, 7.5f, -8.5f);
            camera.transform.LookAt(Vector3.Lerp(ball.position, hoop.position, 0.5f) + Vector3.up * 1.2f);
            camera.fieldOfView = 50f;
            cameraObject.AddComponent<AudioListener>();
        }
    }
}
```

- [ ] **Step 3: Build the scene from batch mode**

Run:

```powershell
& 'C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe' -quit -batchmode -projectPath 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity' -executeMethod HoopLinks.Editor.HoopLinksFirstHoleBuilder.BuildFirstHoleFromBatch -logFile 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\build-first-hole.log'
```

Expected:

- `Assets/Scenes/HoopLinks_FirstHole.unity` exists.
- Unity log contains `Hoop Links first hole built at Assets/Scenes/HoopLinks_FirstHole.unity`.

- [ ] **Step 4: Open the generated scene in the editor**

Run through MCP Unity:

```text
load_scene(scenePath: "Assets/Scenes/HoopLinks_FirstHole.unity")
```

Expected: active scene is `HoopLinks_FirstHole`.

---

### Task 5: Tune Shot Lifecycle

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\ShotController.cs`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\CourseManager.cs`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Editor\HoopLinks\HoopLinksFirstHoleBuilder.cs`

- [ ] **Step 1: Ensure strokes increment exactly once per launch**

Inspect `ShotController.Launch()`.

Expected launch body:

```csharp
public void Launch()
{
    if (ball == null || aimPivot == null)
    {
        return;
    }

    Vector3 velocity = CalculateLaunchVelocity(aimPivot.forward, power, minImpulse, maxImpulse, arcLift);
    ball.Launch(velocity);
    courseManager?.NotifyShotLaunched();
    SetInputLocked(true);
}
```

- [ ] **Step 2: Ensure input unlocks after every miss**

Inspect `CourseManager.ResolveMiss()`.

Expected method:

```csharp
public void ResolveMiss()
{
    ball.ResetToTee();
    shotController?.SetInputLocked(false);
    hud?.SetMessage("Try again.");
    hud?.SetPower(0f);
}
```

- [ ] **Step 3: Run Play Mode manually**

In Unity, press Play in `HoopLinks_FirstHole`.

Expected:

- Left/right rotates aim guide.
- Space charges the power bar.
- Releasing space launches the ball.
- Stroke count increases by one.
- The ball resets after a stall or out-of-bounds shot.

- [ ] **Step 4: Tune values for first feel pass**

If the shot is too weak or too strong, adjust the serialized defaults in `ShotController.cs`:

```csharp
[SerializeField] private float minImpulse = 8f;
[SerializeField] private float maxImpulse = 22f;
[SerializeField] private float arcLift = 6f;
[SerializeField] private float chargeSeconds = 1.25f;
```

Recommended first tuning range:

- `minImpulse`: 7f to 10f.
- `maxImpulse`: 18f to 26f.
- `arcLift`: 4.5f to 8f.
- `chargeSeconds`: 1.0f to 1.6f.

- [ ] **Step 5: Rebuild scene if builder values changed**

Run:

```powershell
& 'C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe' -quit -batchmode -projectPath 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity' -executeMethod HoopLinks.Editor.HoopLinksFirstHoleBuilder.BuildFirstHoleFromBatch -logFile 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\build-first-hole.log'
```

Expected: scene is regenerated cleanly.

---

### Task 6: Verify Hoop Visual And Scoring

**Files:**
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Editor\HoopLinks\HoopLinksFirstHoleBuilder.cs`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Assets\Scripts\HoopLinks\HoopGoal.cs`

- [ ] **Step 1: Inspect rim object hierarchy**

Run through MCP Unity:

```text
get_scene_info()
```

Then inspect hierarchy for `Hoop/Rim Segment 01` through `Hoop/Rim Segment 18`.

Expected:

- Rim is built from separate visible segments.
- Center is open.
- `Score Trigger` is invisible and inside/below the rim.

- [ ] **Step 2: Test a valid made basket through Play Mode**

In Play Mode, aim a bank shot or temporarily place the ball above the rim with downward velocity using the inspector.

Expected:

- `HoopGoal` calls `RecordMadeBasket`.
- HUD shows `Made it in X strokes.`
- Further input is locked after the make.

- [ ] **Step 3: Tighten scoring if side-entry shots count incorrectly**

If side entries count as makes, update `HoopGoal.IsValidEntryVelocity` to also require limited sideways speed:

```csharp
public static bool IsValidEntryVelocity(Vector3 velocity, float downwardThreshold)
{
    Vector2 horizontal = new Vector2(velocity.x, velocity.z);
    return velocity.y <= downwardThreshold && horizontal.magnitude <= 8.5f;
}
```

Add this assertion to `HoopLinksRuntimeTests.cs`:

```csharp
Assert.IsFalse(HoopGoal.IsValidEntryVelocity(new Vector3(10f, -1.2f, 0f), -0.35f));
```

Run EditMode tests again.

---

### Task 7: Final Local Verification

**Files:**
- No new files unless a tuning change is needed.

- [ ] **Step 1: Run EditMode tests**

Run:

```powershell
& 'C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe' -batchmode -projectPath 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity' -runTests -testPlatform EditMode -testResults 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\editmode-results.xml' -logFile 'C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity\Logs\editmode-final.log'
```

Expected: EditMode tests pass.

- [ ] **Step 2: Check Unity console errors**

Run through MCP Unity:

```text
get_console_logs(logType: "error", limit: 50, includeStackTrace: false)
```

Expected: no project script errors.

- [ ] **Step 3: Play the hole in editor**

Manual QA checklist:

- Ball starts on tee.
- Camera frames ball, bank wall, and hoop.
- Rim has an open center.
- Aim guide rotates left and right.
- Power bar responds to space.
- Released shot launches ball.
- Ball can bank off the side wall.
- Ball can score.
- Misses reset quickly.

- [ ] **Step 4: Record local checkpoint status**

Do not commit unless the user explicitly asks. Report:

- Files created.
- Tests run.
- Unity scene created.
- Any tuning notes.
- Whether a Windows build was skipped or completed.
