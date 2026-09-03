import math

def calc_launch_trajectory(p0, p1, extra_apex=4.0):
    g_up = 28.0
    g_down = 37.8
    
    dx = p1[0] - p0[0]
    dy = p1[1] - p0[1]
    dz = p1[2] - p0[2]
    dh = math.sqrt(dx*dx + dz*dz)
    
    # Apex height above p0
    H = max(dy + extra_apex, 5.0)
    vy0 = math.sqrt(2 * g_up * H)
    t_up = vy0 / g_up
    
    h_fall = H - dy
    t_down = math.sqrt(2 * h_fall / g_down)
    T = t_up + t_down
    
    vx0 = dx / T
    vz0 = dz / T
    
    print(f"From {p0} to {p1}:")
    print(f"  dx={dx:.1f}, dy={dy:.1f}, dz={dz:.1f}, horiz_dist={dh:.1f}")
    print(f"  Apex={H:.1f}m, vy0={vy0:.2f} m/s, t_up={t_up:.2f}s, t_down={t_down:.2f}s, Total T={T:.2f}s")
    print(f"  vx0={vx0:.2f} m/s, vz0={vz0:.2f} m/s, launch_speed={math.sqrt(vx0**2 + vy0**2 + vz0**2):.2f} m/s")
    
    # Verify simulation
    dt = 1.0 / 120.0
    x, y, z = p0
    vx, vy, vz = vx0, vy0, vz0
    for step in range(int(T / dt) + 1):
        g = g_down if vy < 0 else g_up
        vy -= g * dt
        x += vx * dt
        y += vy * dt
        z += vz * dt
    print(f"  Simulation landing at t={T:.2f}s: ({x:.2f}, {y:.2f}, {z:.2f}) [Error: {math.sqrt((x-p1[0])**2 + (y-p1[1])**2 + (z-p1[2])**2):.3f}m]\n")

print("=== TARGETED JUMP PAD TRAJECTORY VERIFICATION ===")
# Zone 1 Shortcut Pad: from Hab Pod 2 (6.5, 6.8, -19.5) to Radar Catwalk (-6.0, 32.2, -32.0)
calc_launch_trajectory((6.5, 6.8, -19.5), (-6.0, 32.2, -32.0), extra_apex=5.0)

# Zone 4 Foundry Entrance: from Launch Platform (4.0, 362.4, 0.0) to Landing Platform (16.0, 394.0, 0.0)
calc_launch_trajectory((4.0, 362.4, 0.0), (16.0, 394.0, 0.0), extra_apex=6.0)

# Zone 6 Grand Zenith: from Zenith Launch (0, 972.4, 0) to Summit Plaza (0, 1000.0, 0)
calc_launch_trajectory((0, 972.4, 0), (0, 1000.0, 0), extra_apex=4.0)
