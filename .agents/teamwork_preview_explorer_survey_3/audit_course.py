import math

class Vec3:
    def __init__(self, x=0.0, y=0.0, z=0.0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
    def __repr__(self):
        return f"({self.x:.2f}, {self.y:.2f}, {self.z:.2f})"
    def copy(self):
        return Vec3(self.x, self.y, self.z)
    def add(self, o):
        return Vec3(self.x + o.x, self.y + o.y, self.z + o.z)
    def horiz_dist_to(self, o):
        return math.sqrt((self.x - o.x)**2 + (self.z - o.z)**2)

class Box:
    def __init__(self, zone, name, center, size, is_launch_pad=False, impulse=0):
        self.zone = zone
        self.name = name
        self.center = center.copy()
        self.size = size.copy()
        self.top_y = center.y + size.y / 2.0
        self.bottom_y = center.y - size.y / 2.0
        self.min_x = center.x - size.x / 2.0
        self.max_x = center.x + size.x / 2.0
        self.min_z = center.z - size.z / 2.0
        self.max_z = center.z + size.z / 2.0
        self.is_launch_pad = is_launch_pad
        self.impulse = impulse

    def horiz_gap(self, o):
        dx = max(0.0, max(self.min_x - o.max_x, o.min_x - self.max_x))
        dz = max(0.0, max(self.min_z - o.max_z, o.min_z - self.max_z))
        return math.sqrt(dx*dx + dz*dz)

def build_all():
    elements = []

    # ==================== ZONE 1 ====================
    z = 1
    elements.append(Box(z, "Ground Tarmac", Vec3(0, -0.6, 0), Vec3(90, 1.2, 90)))
    elements.append(Box(z, "Rover Bumper", Vec3(0, 0.25, -1.3), Vec3(2.6, 0.45, 0.6)))
    elements.append(Box(z, "Rover Hood", Vec3(0, 0.85, -2.4), Vec3(2.5, 0.7, 1.6)))
    elements.append(Box(z, "Rover Cab", Vec3(0, 1.65, -3.7), Vec3(2.5, 0.9, 1.4)))
    elements.append(Box(z, "Rover Cargo", Vec3(0, 2.0, -6.1), Vec3(2.7, 1.6, 4.0)))
    elements.append(Box(z, "Hab Pod 1", Vec3(0, 1.9, -10.0), Vec3(4.6, 3.8, 3.8)))
    elements.append(Box(z, "Solar Array 1", Vec3(0, 5.0, -15.5), Vec3(6.5, 0.4, 3.8)))
    elements.append(Box(z, "Hab Pod 2", Vec3(5.5, 3.3, -19.5), Vec3(4.6, 6.6, 4.0)))
    elements.append(Box(z, "Shortcut Jump Pad 1", Vec3(6.5, 6.8, -19.5), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=32))
    elements.append(Box(z, "Mag-Lev Rail 1", Vec3(5.5, 8.2, -21.0), Vec3(2.6, 0.5, 10.0)))
    elements.append(Box(z, "Catwalk 1", Vec3(4.5, 9.6, -30.0), Vec3(3.2, 0.4, 3.0)))
    elements.append(Box(z, "Catwalk 2", Vec3(2.5, 11.0, -32.0), Vec3(3.0, 0.4, 3.0)))

    spireCenter = Vec3(0, 0, -32)
    spiralRadius = 5.2
    currY = 12.5
    for i in range(10):
        angle = (i / 10.0) * math.pi * 1.8
        x = spireCenter.x + math.cos(angle) * spiralRadius
        zc = spireCenter.z + math.sin(angle) * spiralRadius
        currY += 1.55
        elements.append(Box(z, f"Spire Step {i+1}", Vec3(x, currY, zc), Vec3(3.2, 0.4, 3.2)))

    elements.append(Box(z, "Spire Transition 1", Vec3(-3.0, 29.5, -32.0), Vec3(3.0, 0.4, 3.0)))
    elements.append(Box(z, "Spire Transition 2", Vec3(-4.8, 31.0, -32.0), Vec3(2.8, 0.4, 2.8)))
    elements.append(Box(z, "Radar Catwalk", Vec3(-6.0, 32.18, -32), Vec3(9.9, 0.5, 9.9)))
    elements.append(Box(z, "Mag-Lev Mast Rail", Vec3(-6.0, 34.0, -25.0), Vec3(2.4, 0.5, 14.0)))
    elements.append(Box(z, "Upper Transition 1", Vec3(-6.0, 38.5, -28.0), Vec3(3.2, 0.4, 3.2)))
    elements.append(Box(z, "Upper Transition 2", Vec3(-6.0, 40.2, -24.0), Vec3(3.2, 0.4, 3.2)))
    elements.append(Box(z, "Upper Transition 3", Vec3(-6.0, 42.0, -21.0), Vec3(3.2, 0.4, 3.2)))

    currY = 43.5
    currX = -6.0
    currZ = -18.0
    for s in range(8):
        currY += 1.55
        currZ += 2.5
        currX += 1.0 if s % 2 == 0 else -1.0
        elements.append(Box(z, f"Upper Step {s+1}", Vec3(currX, currY, currZ), Vec3(3.2, 0.4, 3.2)))

    elements.append(Box(z, "Jump Pad 2", Vec3(currX, currY + 0.4, currZ), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=25))
    elements.append(Box(z, "Post Pad Step 1", Vec3(currX, currY + 1.6, currZ + 2.8), Vec3(3.4, 0.4, 3.4)))
    elements.append(Box(z, "Post Pad Step 2", Vec3(currX, currY + 3.2, currZ + 5.6), Vec3(3.4, 0.4, 3.4)))
    cp1Center = Vec3(currX, 60.0, currZ + 9.0)
    elements.append(Box(z, "Checkpoint 1 Deck", cp1Center, Vec3(10.0, 1.2, 10.0)))

    # ==================== ZONE 2 ====================
    z = 2
    currX = -6.0
    currZ = 12.0
    currY = 60.6

    for i in range(6):
        currY += 1.55
        currZ += 3.0
        currX += 1.5 if i % 2 == 0 else -1.5
        elements.append(Box(z, f"MagLev Step {i+1}", Vec3(currX, currY, currZ), Vec3(4.0, 0.5, 3.2)))

    currY += 1.6
    currZ += 4.0
    # Mag-Lev Rail Segment at 72m, length 12.0
    elements.append(Box(z, "Mag-Lev Rail 72m", Vec3(currX, currY, currZ + 6.0), Vec3(2.6, 0.5, 12.0)))

    for i in range(14):
        currY += 1.55
        angle = i * 0.45
        currX += math.cos(angle) * 2.8
        currZ += math.sin(angle) * 2.8
        elements.append(Box(z, f"Solar Catwalk {i+1}", Vec3(currX, currY, currZ), Vec3(3.2, 0.45, 3.2)))

    currY = 98.0
    elements.append(Box(z, "Power Conduit Hub 98m", Vec3(currX, currY, currZ + 7.5), Vec3(2.8, 0.5, 15.0)))
    elements.append(Box(z, "Jump Pad 3 (Conduit)", Vec3(currX, currY + 0.5, currZ + 6.0), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=30))

    for i in range(8):
        currY += 1.55
        currZ += 2.8
        currX += 1.4 if i % 2 == 0 else -1.4
        elements.append(Box(z, f"Walking Step {i+1}", Vec3(currX, currY, currZ), Vec3(3.2, 0.5, 3.2)))

    currY += 1.6
    # Turbine at currY + 4, radius 3.4, height 4.5. Top cap at currY + 4.68
    elements.append(Box(z, "Fusion Turbine 116m", Vec3(currX, currY + 4, currZ + 4), Vec3(7.2, 4.9, 7.2)))

    currY += 3.0
    # Slope at currY + 1.5, currZ + 8.0, size (3.4, 0.5, 8.0)
    elements.append(Box(z, "Solar Energy Ramp", Vec3(currX, currY + 1.5, currZ + 8.0), Vec3(3.4, 0.5, 8.0)))
    currY += 3.0
    currZ += 12.0

    # Suspended Mag-Lev Bridge at 128m
    elements.append(Box(z, "Mag-Lev Bridge 128m", Vec3(currX, currY + 0.8, currZ + 8.0), Vec3(2.6, 0.5, 16.0)))
    currY += 2.0
    currZ += 14.0

    elements.append(Box(z, "Jump Pad 4 (Canyon)", Vec3(currX, currY + 0.4, currZ), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=32))

    for i in range(22):
        currY += 1.55
        currX += 1.6 if i % 2 == 0 else -1.6
        currZ += 2.5
        elements.append(Box(z, f"Titanium Gantry {i+1}", Vec3(currX, currY, currZ), Vec3(3.0, 0.4, 3.0)))

    for c in range(3):
        currY += 1.5
        currZ += 3.0
        elements.append(Box(z, f"Crumbling Tile {c+1}", Vec3(currX, currY, currZ), Vec3(3.0, 0.4, 3.0)))

    currY += 1.5
    currZ += 3.5
    elements.append(Box(z, "Section 2 End Deck", Vec3(currX, currY, currZ), Vec3(8.0, 1.0, 8.0)))

    # ==================== ZONE 3 ====================
    z = 3
    currY = 182.0
    currX = 14.0
    currZ = 10.0

    for pod in range(6):
        elements.append(Box(z, f"Cargo Module {pod+1}", Vec3(currX, currY + 1.6, currZ), Vec3(4.8, 3.2, 7.0)))
        for step in range(4):
            currY += 1.55
            currX += 1.8 if step % 2 == 0 else -1.8
            currZ += 2.2
            elements.append(Box(z, f"Cargo Step {pod+1}-{step+1}", Vec3(currX, currY, currZ), Vec3(3.2, 0.4, 3.2)))

    currY += 1.6
    # Shuttle moving platform: (currX, currY, currZ) to (currX + 10, currY, currZ - 4)
    elements.append(Box(z, "Cargo Shuttle", Vec3(currX, currY, currZ), Vec3(4.2, 0.6, 4.2)))

    currX += 12.0
    currZ -= 6.0
    currY += 1.6
    elements.append(Box(z, "Shuttle Landing Deck", Vec3(currX, currY, currZ), Vec3(6.5, 1.0, 6.5)))
    elements.append(Box(z, "Jump Pad 5 (Cargo Apex)", Vec3(currX, currY + 0.6, currZ), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=34))

    for s in range(25):
        currY += 1.55
        currX += 1.5 if s % 2 == 0 else -1.5
        currZ += 2.4
        elements.append(Box(z, f"Cargo Climb Step {s+1}", Vec3(currX, currY, currZ), Vec3(3.2, 0.4, 3.2)))

    currY += 1.8
    # Rotating crane arm at (currX, currY, currZ - 8), size (16.0, 0.8, 2.4)
    elements.append(Box(z, "Rotating Crane Arm", Vec3(currX, currY, currZ - 8), Vec3(16.0, 0.8, 2.4)))

    currZ -= 16.0
    currY += 2.0
    elements.append(Box(z, "Crane Landing Deck", Vec3(currX, currY, currZ), Vec3(7.5, 1.0, 7.5)))
    elements.append(Box(z, "Jump Pad 6 (Tower Crane)", Vec3(currX, currY + 0.6, currZ), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=38))

    for step in range(36):
        currY += 1.55
        angle = step * 0.35
        currX += math.cos(angle) * 2.2
        currZ += math.sin(angle) * 2.2
        elements.append(Box(z, f"Haven Spiral Step {step+1}", Vec3(currX, currY, currZ), Vec3(3.2, 0.4, 3.2)))

    currY += 1.5
    elements.append(Box(z, "Checkpoint 2 Haven Deck", Vec3(currX, currY, currZ), Vec3(10.0, 1.2, 10.0)))

    # ==================== ZONE 4 ====================
    z = 4
    currX = 0
    currZ = 0
    currY = 362.0

    elements.append(Box(z, "Foundry Launch Platform", Vec3(currX + 4, currY, currZ), Vec3(5.0, 0.8, 5.0)))
    elements.append(Box(z, "Jump Pad 7 (Foundry Entrance)", Vec3(currX + 4, currY + 0.4, currZ), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=42))

    currY = 394.0
    currX += 16.0
    elements.append(Box(z, "Foundry Landing Platform", Vec3(currX, currY, currZ), Vec3(8.0, 1.2, 8.0)))

    for cog in range(4):
        currX += 8 if cog % 2 == 0 else -8
        currZ += 10
        currY += 1.6
        elements.append(Box(z, f"Clockwork Cog {cog+1}", Vec3(currX, currY, currZ), Vec3(9.5, 0.9, 9.5)))
        for s in range(4):
            currY += 1.55
            elements.append(Box(z, f"Cog Walkway {cog+1}-{s+1}", Vec3(currX + (2 if s % 2 == 0 else -2), currY, currZ + s * 2.2), Vec3(3.2, 0.4, 3.2)))

    for pend in range(3):
        currZ += 12.0
        currY += 1.6
        elements.append(Box(z, f"Pendulum Platform {pend+1}", Vec3(currX, currY, currZ), Vec3(4.5, 0.8, 4.5)))
        for st in range(3):
            currY += 1.55
            currZ += 2.5
            elements.append(Box(z, f"Pendulum Step {pend+1}-{st+1}", Vec3(currX, currY, currZ), Vec3(3.4, 0.4, 3.4)))

    currY += 1.6
    currZ += 8.0
    elements.append(Box(z, "Foundry Elevator", Vec3(currX, currY, currZ), Vec3(5.0, 0.8, 5.0)))

    currY += 36.0
    elements.append(Box(z, "Elevator Exit Landing", Vec3(currX, currY, currZ + 6.0), Vec3(7.0, 1.0, 7.0)))
    elements.append(Box(z, "Jump Pad 8 (High Foundry)", Vec3(currX, currY + 0.6, currZ + 6.0), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=44))

    currY += 35.0
    currZ -= 14.0
    elements.append(Box(z, "Upper Foundry Landing", Vec3(currX, currY, currZ), Vec3(8.5, 1.2, 8.5)))

    for i in range(28):
        currZ -= 2.6
        currY += 1.55
        currX += 1.2 if i % 2 == 0 else -1.2
        elements.append(Box(z, f"Foundry High Risk Step {i+1}", Vec3(currX, currY, currZ), Vec3(3.0, 0.5, 3.0)))

    # ==================== ZONE 5 ====================
    z = 5
    currY = 605.0
    currX = 0
    currZ = -60.0

    for i in range(14):
        angle = i * 0.7
        radius = 8 + (i % 3) * 3
        currX = math.cos(angle) * radius
        currZ = -60 + math.sin(angle) * radius
        elements.append(Box(z, f"Monolith Top {i+1}", Vec3(currX, currY, currZ), Vec3(3.8, 0.6, 3.8)))

        if i in (2, 6, 10):
            elements.append(Box(z, f"Jump Pad (Monolith {i+1})", Vec3(currX, currY + 0.4, currZ), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=36))

        for s in range(8):
            currY += 1.55
            bridgeAngle = angle + (s * 0.08)
            bx = math.cos(bridgeAngle) * (radius + s * 0.8)
            bz = -60 + math.sin(bridgeAngle) * (radius + s * 0.8)
            elements.append(Box(z, f"Monolith Bridge {i+1}-{s+1}", Vec3(bx, currY, bz), Vec3(2.8, 0.5, 2.8)))

    elements.append(Box(z, "Jump Pad 11 (Monolith Pinnacle)", Vec3(currX, currY + 0.5, currZ), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=42))

    for s in range(7):
        currY += 1.55
        currZ += 2.2
        elements.append(Box(z, f"Pre CP3 Step {s+1}", Vec3(currX, currY, currZ), Vec3(3.2, 0.5, 3.2)))

    currY += 1.5
    elements.append(Box(z, "Checkpoint 3 Vertigo Deck", Vec3(currX, currY, currZ + 6), Vec3(11.0, 1.4, 11.0)))

    # ==================== ZONE 6 ====================
    z = 6
    currY = 858.0
    currX = 0
    currZ = -16.0

    for tier in range(4):
        tierRadius = 10.0 - tier * 1.5
        for i in range(18):
            angle = (i / 18.0) * math.pi * 2 + tier * 1.2
            currX = math.cos(angle) * tierRadius
            currZ = math.sin(angle) * tierRadius
            currY += 1.55
            elements.append(Box(z, f"Colonnade Tier {tier+1} Step {i+1}", Vec3(currX, currY, currZ), Vec3(3.2, 0.5, 3.2)))

        elements.append(Box(z, f"Jump Pad Tier {tier+1}", Vec3(currX, currY + 0.5, currZ), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=35))

    currY += 2.0
    elements.append(Box(z, "Zenith Launch Platform", Vec3(0, currY, 0), Vec3(7.0, 1.2, 7.0)))
    elements.append(Box(z, "Grand Zenith Jump Pad", Vec3(0, currY + 0.6, 0), Vec3(2.6, 0.4, 2.6), is_launch_pad=True, impulse=45))
    elements.append(Box(z, "Summit Plaza 1000m", Vec3(0, 999.0, 0), Vec3(24.0, 2.0, 24.0)))

    return elements

def audit():
    elements = build_all()
    print(f"Total platforms and pads: {len(elements)}")

    impossible_jumps = []
    zone_stats = {z: {'count': 0, 'bad_dy': 0, 'bad_gap': 0} for z in range(1, 7)}

    for i in range(1, len(elements)):
        prev = elements[i-1]
        cur = elements[i]
        dy = cur.top_y - prev.top_y
        gap = cur.horiz_gap(prev)

        z = cur.zone
        zone_stats[z]['count'] += 1

        # Check standard jump violation
        # If prev is NOT a launch pad, this is a standard jump
        is_standard_jump = not prev.is_launch_pad

        is_bad_dy = is_standard_jump and dy > 1.6
        is_bad_gap = is_standard_jump and gap > 2.6

        if is_bad_dy:
            zone_stats[z]['bad_dy'] += 1
        if is_bad_gap:
            zone_stats[z]['bad_gap'] += 1

        if is_bad_dy or is_bad_gap or prev.is_launch_pad:
            impossible_jumps.append({
                'zone': z,
                'from': prev.name,
                'from_pos': f"({prev.center.x:.1f}, {prev.top_y:.1f}, {prev.center.z:.1f})",
                'to': cur.name,
                'to_pos': f"({cur.center.x:.1f}, {cur.top_y:.1f}, {cur.center.z:.1f})",
                'dy': dy,
                'gap': gap,
                'is_launch_pad': prev.is_launch_pad,
                'impulse': prev.impulse,
                'bad_dy': is_bad_dy,
                'bad_gap': is_bad_gap
            })

    print("\n=== ZONE AUDIT SUMMARY ===")
    for z in range(1, 7):
        print(f"Zone {z}: {zone_stats[z]['count']} transitions, {zone_stats[z]['bad_dy']} bad dy (>1.6m), {zone_stats[z]['bad_gap']} bad gap (>2.6m)")

    print("\n=== DETAILED IMPOSSIBLE / LAUNCH PAD JUMPS ===")
    for item in impossible_jumps:
        prefix = "[LAUNCH PAD]" if item['is_launch_pad'] else "[IMPOSSIBLE JUMP]"
        reasons = []
        if item['bad_dy']: reasons.append(f"dy={item['dy']:+.2f}m > 1.6m")
        if item['bad_gap']: reasons.append(f"gap={item['gap']:.2f}m > 2.6m")
        if item['is_launch_pad']: reasons.append(f"Launch impulse={item['impulse']}, target dy={item['dy']:+.2f}m, gap={item['gap']:.2f}m")
        reason_str = ", ".join(reasons)
        print(f"Z{item['zone']} {prefix}: {item['from']} {item['from_pos']} -> {item['to']} {item['to_pos']} | {reason_str}")

if __name__ == '__main__':
    audit()
