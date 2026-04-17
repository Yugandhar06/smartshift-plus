import random

def check_velocity_continuity(shift_data: dict) -> bool:
    """
    Check for unrealistic speed changes (teleportation detection)
    Returns: True if valid, False if potentially spoofed
    """
    # Simple check for now: mock distance delta vs time delta
    dist_km = shift_data.get('distance_km', 0.0)
    time_hrs = shift_data.get('time_hrs', 0.0)
    
    if time_hrs <= 0: return True
    avg_speed = dist_km / time_hrs
    
    # 80km/hr is an extreme upper limit for delivery in city traffic
    return avg_speed <= 80.0

def is_in_activation_ring(shift_data: dict) -> bool:
    """
    Check if user is part of a high-density 'activation ring' (hub-spoofing)
    """
    # Logic: check if cluster size at these coordinates > threshold
    # Returns True if suspicious
    return shift_data.get('nearby_workers', 0) > 40

def calculate_bps(shift_data: dict) -> int:
    """
    Calculate Behavioral Presence Score (BPS) (0-100)
    Multi-sensor validation for TrustMesh
    """
    score = 0
    
    # 1. Mock location flag (Hardware level)
    if not shift_data.get('mock_location_detected'):
        score += 20
    else:
        # Hard fail if GPS mock is reported by system OS
        return 0  
    
    # 2. GPS noise variance (Natural drift vs perfectly static spoof)
    gps_variance = shift_data.get('gps_variance', 0.0)
    if 0.0001 < gps_variance < 0.01: 
        score += 15
    
    # 3. Accelerometer motion (Is the phone actually moving?)
    accel_stddev = shift_data.get('accel_stddev', 0.0)
    if accel_stddev > 0.5:
        score += 15
    
    # 4. Velocity continuity (Teleportation check)
    if check_velocity_continuity(shift_data):
        score += 15
    else:
        return 0  # Hard fail for teleportation
    
    # 5. Pre-disruption activity (Were they active before the event?)
    if shift_data.get('orders_last_4hrs', 0) > 0:
        score += 20
    
    # 6. Activation Ring Check (Cluster/Hub spoofing)
    if not is_in_activation_ring(shift_data):
        score += 15
        
    return score
