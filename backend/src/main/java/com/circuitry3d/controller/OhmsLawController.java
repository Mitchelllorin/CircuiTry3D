package com.circuitry3d.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.circuitry3d.model.OhmsLawRequest;
import com.circuitry3d.model.OhmsLawResponse;
import com.circuitry3d.service.OhmsLawService;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class OhmsLawController {

    private final OhmsLawService ohmsLawService;

    public OhmsLawController(OhmsLawService ohmsLawService) {
        this.ohmsLawService = ohmsLawService;
    }

    @PostMapping("/ohms-law")
    public ResponseEntity<?> calculate(@RequestBody OhmsLawRequest request) {
        try {
            OhmsLawResponse response = ohmsLawService.calculate(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }
}
