import math

def sim_launch(launch_impulse, forward_speed=8.0, target_dy=32.0, target_dist=12.0, holds_space=False):
    dt = 1.0 / 60.0
    gravity = 28.0
    fall_gravity_mult = 1.35
    air_drag = 1.2
    
    vy = launch_impulse
    vx = forward_speed
    y = 0.0
    x = 0.0
    
    t = 0.0
    max_y = 0.0
    
    trajectory = []
    
    for frame in range(300): # 5 seconds max
        t += dt
        
        # Variable jump height check
        if not holds_space and vy > 2.0:
            vy *= 0.55
            
        # Drag
        vx *= (1.0 - air_drag * 0.05)
        
        # Gravity
        cur_grav = gravity * fall_gravity_mult if vy < 0 else gravity
        vy -= cur_grav * dt
        
        x += vx * dt
        y += vy * dt
        
        if y > max_y:
            max_y = y
            
        if y < 0 and frame > 5:
            break
            
    print(f"Impulse={launch_impulse}, SpaceHeld={holds_space}: Max Y={max_y:.2f}m, Final X={x:.2f}m in {t:.2f}s")

print("=== LAUNCH TRAJECTORY TEST (CURRENT PHYSICS) ===")
print("-- If player does NOT hold space (natural behavior when stepping on pad) --")
sim_launch(32, 8.0, holds_space=False)
sim_launch(42, 8.0, holds_space=False)
sim_launch(45, 8.0, holds_space=False)

print("\n-- If player holds space --")
sim_launch(32, 8.0, holds_space=True)
sim_launch(42, 8.0, holds_space=True)
sim_launch(45, 8.0, holds_space=True)
