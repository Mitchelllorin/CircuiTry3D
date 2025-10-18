package com.circuitry3d.model;

public class OhmsLawResponse {
    private final double voltage;
    private final double current;
    private final double resistance;

    public OhmsLawResponse(double voltage, double current, double resistance) {
        this.voltage = voltage;
        this.current = current;
        this.resistance = resistance;
    }

    public double getVoltage() { return voltage; }
    public double getCurrent() { return current; }
    public double getResistance() { return resistance; }
}
