package com.fintech.banking.service.impl;

import com.fintech.banking.domain.entity.Card;
import com.fintech.banking.dto.request.CreateCardRequest;
import com.fintech.banking.dto.response.CardResponse;
import com.fintech.banking.repository.CardRepository;
import com.fintech.banking.repository.UserRepository;
import com.fintech.banking.service.CardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CardServiceImpl implements CardService {

    private final CardRepository cardRepository;
    private final UserRepository userRepository;

    private CardResponse toResponse(Card card) {
        return CardResponse.builder()
                .id(card.getId())
                .cardType(card.getCardType())
                .brand(card.getBrand())
                .holderName(card.getHolderName())
                .lastFour(card.getLastFour())
                .expiryMonth(card.getExpiryMonth())
                .expiryYear(card.getExpiryYear())
                .creditLimit(card.getCreditLimit())
                .availableLimit(card.getAvailableLimit())
                .active(card.getActive())
                .createdAt(card.getCreatedAt())
                .build();
    }

    @Override
    public List<CardResponse> getMyCards(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usu\u00e1rio n\u00e3o encontrado"));
        return cardRepository.findByUserIdAndActiveTrue(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CardResponse createCard(String email, CreateCardRequest request) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usu\u00e1rio n\u00e3o encontrado"));
        Card card = Card.builder()
                .user(user)
                .cardType(request.getCardType())
                .brand(request.getBrand())
                .holderName(request.getHolderName())
                .lastFour(request.getLastFour())
                .expiryMonth(request.getExpiryMonth())
                .expiryYear(request.getExpiryYear())
                .creditLimit(request.getCreditLimit())
                .availableLimit(request.getCreditLimit())
                .build();
        cardRepository.save(card);
        log.info("[CARD] Cart\u00e3o criado para: {}", email);
        return toResponse(card);
    }

    @Override
    @Transactional
    public CardResponse updateCard(String email, UUID cardId, CreateCardRequest request) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usu\u00e1rio n\u00e3o encontrado"));
        var card = cardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Cart\u00e3o n\u00e3o encontrado"));
        if (!card.getUser().getId().equals(user.getId()))
            throw new IllegalArgumentException("Cart\u00e3o n\u00e3o pertence ao usu\u00e1rio");
        card.setCardType(request.getCardType());
        card.setBrand(request.getBrand());
        card.setHolderName(request.getHolderName());
        card.setLastFour(request.getLastFour());
        card.setExpiryMonth(request.getExpiryMonth());
        card.setExpiryYear(request.getExpiryYear());
        if (request.getCreditLimit() != null) {
            card.setCreditLimit(request.getCreditLimit());
            card.setAvailableLimit(request.getCreditLimit());
        }
        cardRepository.save(card);
        log.info("[CARD] Cart\u00e3o atualizado: {}", cardId);
        return toResponse(card);
    }

    @Override
    @Transactional
    public void deleteCard(String email, UUID cardId) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usu\u00e1rio n\u00e3o encontrado"));
        var card = cardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Cart\u00e3o n\u00e3o encontrado"));
        if (!card.getUser().getId().equals(user.getId()))
            throw new IllegalArgumentException("Cart\u00e3o n\u00e3o pertence ao usu\u00e1rio");
        card.setActive(false);
        cardRepository.save(card);
        log.info("[CARD] Cart\u00e3o removido: {}", cardId);
    }
}
