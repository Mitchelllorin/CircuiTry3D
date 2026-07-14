package com.circuitry3d.service;

import org.springframework.stereotype.Service;

import com.circuitry3d.model.OhmsLawRequest;
import com.circuitry3d.model.OhmsLawResponse;

@Service
public class OhmsLawService {

    public OhmsLawResponse calculate(OhmsLawRequest request) {
        int provided = 0;
        if (request.getVoltage() != null) provided++;
        if (request.getCurrent() != null) provided++;
        if (request.getResistance() != null) provided++;
        if (provided != 2) {
            throw new IllegalArgumentException("Provide exactly two of voltage, current, resistance");
        }

        Double v = request.getVoltage();
        Double i = request.getCurrent();
        Double r = request.getResistance();

        if (v == null) {
            // V = I * R
            return new OhmsLawResponse(i * r, i, r);
        }
        if (i == null) {
            // I = V / R
            return new OhmsLawResponse(v, v / r, r);
        }
        // R = V / I
        return new OhmsLawResponse(v, i, v / i);
    }
}
